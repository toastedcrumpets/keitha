import React, { useEffect, useRef } from 'react';

import { Store } from 'pullstate';

import socketIOClient from 'socket.io-client';

import { KeyboardProvider, Input } from './Keyboard';

import { Button, ButtonGroup, ButtonToolbar, Container, Row, Col, Nav, NavItem, NavLink, Dropdown, Tab } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import './App.css';

import numberformat from './numberformat.js';

import TimeChart from "timechart";

const AppStore = new Store({
  ui_state: {
    tabs_minimised: false,
  },
  conf_state: {
    triggerMode:0,
    triggerRate:-1,
  },
  buf_state: {
    sum:0,
    sum_sq:0,
    min:1e300,
    max:-1e300,
  },
  connected:false,
  connect_status:"Connecting...",
  last_reading:undefined,
  last_time:undefined,
  datarevision:0,
  realtime:true,
});

///// The actual measurements
//We don't store large data inside the state/pullstate/immer for performance reasons
var readings_state = [];

function TriggerButton(trigMode) {
  //Render the trigger button depending on the mode
  switch (trigMode) {
    case 0:
      return (<><i className="fas fa-stop"></i><span> Hold</span></>);
    case 1:
      return (<><i className="fas fa-camera"></i><span> Single</span></>);
    case 2:
      return (<><i className="fas fa-sync fa-spin"></i><span> Continuous</span></>);
    default:
      throw Error("Invalid trigger mode");
  };
};

function ConnectStatus() {
  const {connected, connect_status} = AppStore.useState(s => ({connected:s.connected, connect_status:s.connect_status}));
  var classes = "fas fa-signal text-success ml-1"
  if (!connected)
    classes = "fas fa-exclamation-circle text-danger ml-1";
  return <Nav.Item href="#">
    <Nav.Link eventKey="disabled" disabled>
      {connect_status}<i className={classes}></i>
    </Nav.Link>
  </Nav.Item>;
}

function TopMenu() {
  const [ triggerMode, triggerRate ] = AppStore.useState(s => ([s.conf_state.triggerMode, s.conf_state.triggerRate]));

  var rate_status = "- Hz";
  if (triggerRate >= 0) {
    rate_status = numberformat(1.0/triggerRate, 3, false)+"Hz"
  }
  
  return <Nav className="topnav">
    <Dropdown as={NavItem} className="mr-auto">
      <Dropdown.Toggle as={NavLink}>{TriggerButton(triggerMode)}</Dropdown.Toggle>
      <Dropdown.Menu>
	<Dropdown.Item onClick={() => socket.emit('conf_state_update', {triggerMode:0}) }>{TriggerButton(0)}</Dropdown.Item>
	<Dropdown.Item onClick={() => socket.emit('conf_state_update', {triggerMode:1}) }>{TriggerButton(1)}</Dropdown.Item>
	<Dropdown.Item onClick={() => socket.emit('conf_state_update', {triggerMode:2}) }>{TriggerButton(2)}</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
    <Nav.Item>
      <Nav.Link eventKey="disabled" disabled>
	{rate_status}
      </Nav.Link>
    </Nav.Item>
    <ConnectStatus/>
  </Nav>;
}

function LargeDisplay() {
  const { reading, tabs_minimised } = AppStore.useState(s => ({
    reading:s.last_reading, tabs_minimised:s.ui_state.tabs_minimised }));
  
  var output;;
  if (reading === undefined)
    output = "+ -.------  V";
  else
    output = numberformat(reading, 6)+'V';
  
  return (<div id="MainDisplay" className={"text-monospace " + (tabs_minimised ? 'minimized': '')}>
    { output }
  </div>);

}


function StatisticsPages() {
  var {min, max, sum, sum_sq} = AppStore.useState(s => ({min:s.buf_state.min, max:s.buf_state.max, sum:s.buf_state.sum, sum_sq:s.buf_state.sum_sq}));
  const N = readings_state.length;
  var avg = sum / N;
  var stddev = Math.sqrt(sum_sq / N - avg * avg);

  avg = numberformat(avg, 6)+'V';
  stddev = numberformat(stddev, 6)+'V';

  var PtP = numberformat(max - min, 6, false)+'V';
  min = numberformat(min, 6)+'V';
  max = numberformat(max, 6)+'V';

  if (N === 0) {
    PtP = "-"
    min = "-";
    max = "-";
    avg = "-";
    stddev = "-";
  }
  return <>
    <Container className="stats-table p-1" fluid>
      <Row>
	<Col>Peak to Peak:</Col>
	<Col>{PtP}</Col>
	<Col>Span:</Col>
	<Col>{N.toString()} readings</Col>
      </Row>
      <Row>
	<Col>Average:</Col>
	<Col>{avg}</Col>
	<Col>Standard Dev:</Col>
	<Col>{stddev}</Col>
      </Row>
      <Row>
	<Col>Maximum:</Col>
	<Col>{max}</Col>
	<Col>Minimum:</Col>
	<Col>{min}</Col>
      </Row>
    </Container>
    <Container fluid>
      <Row>
	<Col>
	</Col>
	<Col>
	</Col>
	<Col>
	  <Button variant="danger" onClick={() => socket.emit('readings_state_update', [[], []])}><i className="far fa-trash-alt"></i> Clear buffer</Button>
	</Col>	 
      </Row>
    </Container>
  </>
  ;
}

let chart = null;

function DataGraphTabPane() {
  const [ datarevision, realtime ] = AppStore.useState(s => [s.datarevision, s.realtime]);

  const plotRef = useRef();
  
  useEffect(() => {
    const trycreate = () => {
      if ((chart === null) && (plotRef)) {
	var el = document.createElement('div');
	el.id = 'chart';
	plotRef.current.appendChild(el);
	chart = new TimeChart(el, {
	  series: [{
	    data:readings_state,
	    lineWidth: 2,
	    color:'lightgreen',
	  }],
	  zoom: {
            x: {
              autoRange: true,
	      minDomainExtent: 1,
            },
            y: {
              autoRange: true,
	      minDomainExtent: 1,
            }
	  },
	  realTime: realtime,
	});

	var style = document.createElement( 'style' );
	style.innerHTML = '.tick { font-size: 1.4em; font-weight:bold;}';
	el.shadowRoot.appendChild(style);
      }
    };
    
    const dispose = () => {
      if (chart !== null) {
	chart.dispose();
	plotRef.current.innerHTML = "";
	chart = null;
      }
    };

    dispose();
    trycreate();
    //Clean up the chart later!
    return dispose;
  }, [datarevision, ]);  

  const chartFollow = () => {
    if (chart !== null)
      chart.options.realTime = true;
  };

  const chartFullView = () => {
    if (chart !== null) {
      var i = 0, len = readings_state.length;
      var minx = +Math.Infinity, maxx = -Math.Infinity;
      var miny = +Math.Infinity, maxy = -Math.Infinity;
      while (i < len) {
	var reading = readings_state[i];
        minx = Math.min(minx, reading.x);
        maxx = Math.max(maxx, reading.x);
        miny = Math.min(miny, reading.y);
        maxy = Math.max(maxy, reading.y);
        i++;
      }
      
      chart.options.zoom.x.minDomain = minx;
      chart.options.zoom.x.maxDomain = maxx;
      chart.options.zoom.y.minDomain = miny;
      chart.options.zoom.y.maxDomain = maxy;
      chart.options.realTime = false;
      chart.update();
    }
  };
  
  return (
    <Tab.Pane eventKey="graph" onEntering={() => {chart.onResize();} }>
      <div style={{display:'flex', flexFlow:'column', height:'50vh'}}>
	<div className="charttoolbar" style={{textAlign:'center'}}>
	  <ButtonToolbar style={{display:'inline-block'}}>
	    <ButtonGroup >
	      <Button onClick={chartFullView}><i className="fas fa-expand"></i></Button>
	      <Button onClick={chartFollow}><i className="fas fa-fighter-jet"></i></Button>
	    </ButtonGroup>
	    <ButtonGroup style={{paddingLeft:'1em'}}>
	      <Button variant="danger" onClick={() => socket.emit('readings_state_update', [[], []])}><i className="far fa-trash-alt"></i> Clear</Button>
	    </ButtonGroup>
	  </ButtonToolbar>
	</div>
	<div id="graph-div" ref={plotRef} style={{flex:1}}>
	</div>
      </div>
    </Tab.Pane>
  );
}

var socket = null;

function App() {
  useEffect(() => {
    //The python backend is always at 8080; however, we like developing
    //with the `npm start` server as it automatically updates the pages (and
    //has cool debugging build options turned on). So we do a bit of
    //wrangling to make the npm server work with the "production" python
    //server.
    socket = socketIOClient(window.location.hostname+':8080');

    socket.on('disconnect', (reason) => {
      AppStore.update(s => {s.connected = false; s.connect_status = "Disconnected"});
      if (reason === 'io server disconnect') {
	// the disconnection was initiated by the server, you need to reconnect manually
	socket.connect();
      }
      // else the socket will automatically try to reconnect
    });
    
    socket.on('connect', () => {
      AppStore.update(s => {s.connected = true; s.connect_status = "Connected"});
      socket.emit('readings_state_sub');//Subscribe to readings state change
      socket.emit('buf_state_sub');//Subscribe to buffer state change
      socket.emit('conf_state_sub');//Subscribe to configuration state
    });

    socket.on('conf_state_update', (payload) => {
      AppStore.update(s => { 
	Object.assign(s.conf_state, payload);
      });
    });

    socket.on('buf_state_update', (payload) => {
      AppStore.update(s => {
	Object.assign(s.buf_state, payload); 
      });
    });

    socket.on('readings_state_add', (payload) => {
      payload[0].forEach((t, idx) => {
	readings_state.push({x:t, y:payload[1][idx]});
      });
      if (chart !== null) {
	chart.update();
      }
      AppStore.update(s => {
	s.last_time    = payload[0][payload[0].length - 1];
	s.last_reading = payload[1][payload[1].length - 1];
      });
    });

    socket.on('readings_state_update', (payload) => {
      //Clear the readings by replacing the array (got to leave the old array in place till we've refreshed the graph)
      readings_state = []; 
      payload[0].forEach((t, idx) => {
	readings_state.push({x:t, y:payload[1][idx]});
      });
      
      AppStore.update(s => {
	s.last_time    = payload[0][payload[0].length - 1];
	s.last_reading = payload[1][payload[1].length - 1];
	s.datarevision += 1;
      });
    });
    
    return () => socket.disconnect();
  }, []);

  var {tabs_minimised} = AppStore.useState(s => ({
    tabs_minimised: s.ui_state.tabs_minimised,
  }));

  return (
    <KeyboardProvider>
      <TopMenu/>
      <main role="main" className="">
	<LargeDisplay/>
	<div id="tabs" className={ tabs_minimised ? 'minimized' : '' }>
	  <Tab.Container defaultActiveKey="graph" onSelect={() => AppStore.update(s => { s.ui_state.tabs_minimised = false;})}>
	    <Row>
	      <Nav variant="tabs">
		<Nav.Item>
		  <Nav.Link eventKey="stats">Stats</Nav.Link>
		</Nav.Item>
		<Nav.Item>
		  <Nav.Link eventKey="mode">Mode</Nav.Link>
		</Nav.Item>
		<Nav.Item>
		  <Nav.Link eventKey="config">Config</Nav.Link>
		</Nav.Item>
		<Nav.Item>
		  <Nav.Link eventKey="graph">Graph</Nav.Link>
		</Nav.Item>
	      </Nav>
	      <div id="tab-minimize"  onClick={() => AppStore.update(s => { s.ui_state.tabs_minimised = !tabs_minimised;})}>
		{
		  tabs_minimised ? <i className="fas fa-angle-up"/> : <i className="fas fa-angle-down"/>
		}
	      </div>
	    </Row>
	    <Row>
	      <Tab.Content>
		<Tab.Pane eventKey="stats">
		  <StatisticsPages/>
		</Tab.Pane>
		<Tab.Pane eventKey="mode">
		</Tab.Pane>
		<Tab.Pane eventKey="config">
		  <Input onChange={ (text) => {} } />
		</Tab.Pane>
		<DataGraphTabPane />
	      </Tab.Content>
	    </Row>
	  </Tab.Container>
	</div>
      </main>
    </KeyboardProvider>
  );
}

export default App;
