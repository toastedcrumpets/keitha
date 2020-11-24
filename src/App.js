import React, { useEffect, useRef } from 'react';

import { Store } from 'pullstate';

import socketIOClient from 'socket.io-client';

import { KeyboardProvider, TouchInput } from './Keyboard';

import { Button, ButtonGroup, ButtonToolbar, Container, Row, Col, Nav, NavItem, NavLink, Dropdown, DropdownButton, Tab } from 'react-bootstrap';
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
    major_mode:0,
    major_modes:['DCV1', 'DCV2', 'DCV3', 'DCV4'],
    options:{},
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
  //Whenever datarevision is changed, the chart is rebuilt. This is to allow data to be deleted/cleared as the chart library doesn't support this for performance reasons.
  datarevision:0,
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
  const [ reading, tabs_minimised, major_modes, major_mode ] = AppStore.useState(s => ([
    s.last_reading, s.ui_state.tabs_minimised,
    s.conf_state.major_modes, s.conf_state.major_mode,
  ]));
  
  var output;;
  if (reading === undefined)
    output = "+ -.------  V";
  else
    output = numberformat(reading, 6)+'V';
  
  return (
    <div id="Display">
      <div id="TopDisplay" className="text-monospace">
	{major_modes[major_mode]}
      </div>
      <div id="MainDisplay" className={"text-monospace " + (tabs_minimised ? 'minimized': '')}>
	{ output }
      </div>
      <div id="BottomDisplay" className="text-monospace">
      </div>
    </div>
  );

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
  const [ datarevision ] = AppStore.useState(s => [s.datarevision]);

  const plotRef = useRef();
  
  useEffect(() => {
    const trycreate = () => {
      if ((chart === null) && (plotRef)) {
	chart = new TimeChart(plotRef.current, {
	  series: [{
	    data:readings_state,
	    lineWidth: 2,
	    color:'lightgreen',
	  }],
	  zoom: {
            x: {
              autoRange: false,
	      minDomainExtent: 1,
            },
            y: {
              autoRange: false,
	      minDomainExtent: 1,
            }
	  },
	  realTime: true,
	});

	var style = document.createElement( 'style' );
	style.innerHTML = '.tick { font-size: 1.4em; font-weight:bold;}';
	plotRef.current.shadowRoot.appendChild(style);
      }
    };
    
    const dispose = () => {
      if (chart !== null) {
	chart.dispose();
	chart = null;
      }
    };

    //dispose();
    trycreate();
    //Clean up the chart later!
    return dispose;
  }, [datarevision]); //This dependency makes sure that the chart is reinitialised whenever the buffer is reset/cleared. 

  const chartFollow = () => {
    if (chart !== null)
      chart.options.realTime = true;
  };

  const chartFullView = () => {
    if (chart !== null) {
      //var i = 0, len = readings_state.length;
      //var minx = +Math.Infinity, maxx = -Math.Infinity;
      //var miny = +Math.Infinity, maxy = -Math.Infinity;
      //while (i < len) {
      //	var reading = readings_state[i];
      //  minx = Math.min(minx, reading.x);
      //  maxx = Math.max(maxx, reading.x);
      //  miny = Math.min(miny, reading.y);
      //  maxy = Math.max(maxy, reading.y);
      //  i++;
      //}
      //
      //chart.options.zoom.x.minDomain = minx;
      //chart.options.zoom.x.maxDomain = maxx;
      //chart.options.zoom.y.minDomain = miny;
      //chart.options.zoom.y.maxDomain = maxy;
      chart.options.xRange = 'auto';
      chart.options.yRange = 'auto';
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
	<div id="chart" ref={plotRef}></div>
      </div>
    </Tab.Pane>
  );
}

/**
 * Performs a deep merge of objects and returns new object. Does not modify
 * objects (immutable) and merges arrays by overwrite.
 *
 * @param {...object} objects - Objects to merge
 * @returns {object} New object with merged key/values
 */
function mergeDeep(...objects) {
  const isObject = obj => obj && typeof obj === 'object';
  
  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach(key => {
      const pVal = prev[key];
      const oVal = obj[key];
      
      if (Array.isArray(pVal) && Array.isArray(oVal)) {
	//Line below merges by concatenation
        //prev[key] = pVal.concat(...oVal);
	//Line below merges by overwrite
        prev[key] = oVal;
      }
      else if (isObject(pVal) && isObject(oVal)) {
        prev[key] = mergeDeep(pVal, oVal);
      }
      else {
        prev[key] = oVal;
      }
    });
    
    return prev;
  }, {});
}


function OptionControl({ option, o_key}) {
  if (option.type === 'dropdown') {
    return <div className="option">
      <span>
	{option.name}
      </span>
      <DropdownButton size="lg" title={option.values[option.value]}>
	{
	  option.values.map((name, idx) =>
	    <Dropdown.Item key={idx} onSelect={() => socket.emit('conf_state_update', {options:{[o_key]:{value:idx}}}) } >{name}
	    </Dropdown.Item>
	  )
	}
      </DropdownButton>
    </div>;
  } else {
    return <div className="option">
      <span>
	{option.name}
      </span>
      <TouchInput onChange={ (value) => socket.emit('conf_state_update', {options:{[o_key]:{value}}}) } value={option.value} mode={option.type} units={option.units} />
    </div>;
  }
}

function OptionControls() {
  var [options ] = AppStore.useState(s => ([
    s.conf_state.options,
  ]));
  
  return Object.keys(options).map((key, idx) => <OptionControl option={options[key]} key={key} o_key={key} />)
}

function LogPage() {
  const [text, setText] = React.useState("Enter something here to test text entry!");
  return <TouchInput onChange={ (value) => setText(value) } value={text} mode="string" units="" />;
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
	s.conf_state = mergeDeep(s.conf_state, payload);
      });
    });

    socket.on('buf_state_update', (payload) => {
      AppStore.update(s => {
	s.buf_state = mergeDeep(s.buf_state, payload); 
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

  var [tabs_minimised, major_mode, major_modes ] = AppStore.useState(s => ([
    s.ui_state.tabs_minimised,
    s.conf_state.major_mode,
    s.conf_state.major_modes,
  ]));
  
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
		  <Nav.Link eventKey="log">Log</Nav.Link>
		</Nav.Item>
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
		<Tab.Pane eventKey="log">
		  <LogPage />
		</Tab.Pane>
		<Tab.Pane eventKey="stats">
		  <StatisticsPages/>
		</Tab.Pane>
		<Tab.Pane eventKey="mode">
		  {
		    major_modes.map((name, idx) =>
		      <Button className="modebutton" key={idx} size="lg" variant="primary" active={major_mode === idx} onClick={() => socket.emit('conf_state_update', {major_mode:idx}) }>
			{name}
		      </Button>)
		  }
		</Tab.Pane>
		<Tab.Pane eventKey="config">
		  <OptionControls/>
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
