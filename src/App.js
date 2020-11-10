import React, { useEffect } from 'react';

import { Store } from 'pullstate';

import socketIOClient from 'socket.io-client';

import { KeyboardProvider, Input } from './Keyboard';

import { Button, Container, Row, Col, Nav, NavItem, NavLink, Dropdown, Tabs, Tab } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

//Need to load plotly this way, as loading it "normally" causes a heap over-size error.
import Plot from 'react-plotly.js';

import './App.css';

import numberformat from './numberformat.js';

const AppStore = new Store({
  ui_state: {
    tabs_minimised: false,
  },
  conf_state: {
    triggerMode:0,    
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
});

///// The actual measurements
//We don't store large data inside the state/pullstate/immer for performance reasons
var readings_state = [];
var timings_state = [];

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
  const {triggerMode} = AppStore.useState(s => ({triggerMode:s.conf_state.triggerMode}));

  return <Nav className="topnav">
    <Dropdown as={NavItem} className="mr-auto">
      <Dropdown.Toggle as={NavLink}>{TriggerButton(triggerMode)}</Dropdown.Toggle>
      <Dropdown.Menu>
	<Dropdown.Item onClick={() => socket.emit('conf_state_update', {triggerMode:0}) }>{TriggerButton(0)}</Dropdown.Item>
	<Dropdown.Item onClick={() => socket.emit('conf_state_update', {triggerMode:1}) }>{TriggerButton(1)}</Dropdown.Item>
	<Dropdown.Item onClick={() => socket.emit('conf_state_update', {triggerMode:2}) }>{TriggerButton(2)}</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
    <ConnectStatus/>
  </Nav>;
}

function LargeDisplay() {
  const { reading, tabs_minimised } = AppStore.useState(s => ({
    reading:s.last_reading, tabs_minimised:s.ui_state.tabs_minimised }));
  
  var start = "", suffix="";
  if (reading === undefined) {
    start = "+ -.------";
    suffix = "\xa0V";
  } else { 
    [start, suffix] = numberformat(reading, 6);
    suffix += "V";
  }
  return (<div id="MainDisplay" className={"text-monospace " + (tabs_minimised ? 'minimized': '')}>
    { start }{suffix}
  </div>);

}


function StatisticsPages() {
  var {min, max, sum, sum_sq} = AppStore.useState(s => ({min:s.buf_state.min, max:s.buf_state.max, sum:s.buf_state.sum, sum_sq:s.buf_state.sum_sq}));
  const N = readings_state.length;
  var avg = sum / N;
  var stddev = Math.sqrt(sum_sq / N - avg * avg);

  avg = numberformat(avg, 6);
  stddev = numberformat(stddev, 6);

  var PtP = numberformat(max - min, 6, false);
  min = numberformat(min, 6);
  max = numberformat(max, 6);

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
	  <Button variant="warning" onClick={() => socket.emit('readings_state_update', [[], []])}>Clear buffer</Button>
	</Col>	 
      </Row>
    </Container>
  </>
  ;
}

var socket = null

function DataGraph() {
  var datarevision = AppStore.useState(s => s.datarevision);
  
  return <Plot
	   data={[
	     {
	       x: timings_state,
	       y: readings_state,
	       type: 'scattergl',
	       mode: 'lines+markers',
	       marker: {color: 'lightgreen'},
	     },
	   ]}
	   layout={ {
	     width: 1024,
	     height: 250,
	     datarevision:datarevision,
	     paper_bgcolor:'rgba(0,0,0,0)',
	     plot_bgcolor:'rgba(0,0,0,0)',
	     margin: {
	       l: 50,
	       r: 20,
	       b: 20,
	       t: 50,
	     },
	     font: {
	       size:18,
	       color:"white",
	     },
	     //template:'plotly_dark',
	   } }
	   config={ {displaylogo: false} }
  />;
}

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
      timings_state.push( ...payload[0]);
      readings_state.push(...payload[1]);
      
      AppStore.update(s => {
	s.last_time    = timings_state[timings_state.length - 1];
	s.last_reading = readings_state[readings_state.length - 1];
	s.datarevision += 1;
      });
    });

    socket.on('readings_state_update', (payload) => {
      timings_state = payload[0];
      readings_state = payload[1];
      AppStore.update(s => {
	s.last_time    = timings_state[timings_state.length - 1];
	s.last_reading = readings_state[readings_state.length - 1];
	s.datarevision = s.datarevision + 1;
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
	<div id="tabs" className={ tabs_minimised ? 'minimized' : '' } >
	  <div id="tab-minimize" onClick={() => AppStore.update(s => { s.ui_state.tabs_minimised = !s.ui_state.tabs_minimised;})} >
	    {
	      tabs_minimised ? <i className="fas fa-window-maximize"/> : <i className="fas fa-window-minimize"/>
	    }
	  </div>
	  <Tabs >
	    <Tab eventKey="stats" title="Stats">
	      <StatisticsPages/>
	    </Tab>
	    <Tab eventKey="mode" title="Mode">
	    </Tab>
	    <Tab eventKey="config" title="Config">
	      <Input onChange={ (text) => {} } />
	    </Tab>
	    <Tab eventKey="graph" title="Graph">	
	      <DataGraph/>
            </Tab>
	  </Tabs>
	</div>
      </main>
    </KeyboardProvider>
  );
}

export default App;
