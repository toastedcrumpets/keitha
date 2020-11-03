import React from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

import { Button } from 'react-bootstrap';

import 'bootstrap/dist/css/bootstrap.min.css';


import './App.css';

import Plot from 'react-plotly.js';

const keyboardState = {
    onInputFocus:() => {},
    onInputBlur:() => {},   
};

const KeyboardContext  = React.createContext(keyboardState);

function KeyboardProvider({children}) {
    const [open, setOpen] = React.useState(false);
    const [text, setText] = React.useState("");
    
    var state = {
	keyboardOpen: open,
	onInputFocus: (text) => {setOpen(true); setText(text);},
	keyboardText: text,
    };

    
    return <KeyboardContext.Provider value={state}>
	{children}
    { open ? <div style={{position:'absolute', bottom:0, left:0, right:0, top:0, opacity:0.5, 'background-color':'black'}} onClick={() => setOpen(false)} /> : null }
	<div style={{position:'absolute', bottom:0, left:0, right:0}} >
	{ open ?
	  <React.Fragment>
	  <div className="hg-theme-default">
	  <input autofocus value={text} className="hg-button" style={{color:'white', width:'100%'}}/>
	  </div>
	  <Keyboard onChange={(text) => setText(text)}/>
	  </React.Fragment>
	  : null}
	</div>
    </KeyboardContext.Provider>;
}

function Input() {
    const [text, setText] = React.useState("");
    const [loadKeyboard, setLoad] = React.useState(false);

    return (
	<KeyboardContext.Consumer>
	    {({ onInputFocus, keyboardOpen, keyboardText }) => {
		if (loadKeyboard)
		    setText(keyboardText);

		if (loadKeyboard && !keyboardOpen)
		    setLoad(false);

		return <input value={text} onFocus={() => { onInputFocus(text); setLoad(true);}}/>;
	    }}
	</KeyboardContext.Consumer>
    );
}


function TriggerButton({trigMode}) {
    //Render the trigger button depending on the mode
    switch (trigMode) {
    case 0:
	return (<React.Fragment><i className="fas fa-stop"></i><span> Hold</span></React.Fragment>);
    case 1:
	return (<React.Fragment><i className="fas fa-camera"></i><span> Single</span></React.Fragment>);
    case 2:
	return (<React.Fragment><i className="fas fa-sync fa-spin"></i><span> Continuous</span></React.Fragment>);
    default:
	throw Error("Invalid trigger mode");
    };
};

function TopMenu(props) {
    const [trigMode, setTrigMode] = React.useState(2);

    return null;
}

function App() {
    return (
	    <KeyboardProvider>
	    <TopMenu/>
	    <main role="main" className="">
	    <div id="MainDisplay" className="text-monospace">
	    +0.00000000 mV
	    </div>
	    <div id="tabs">
	    <nav>
	    <div className="nav nav-tabs" id="nav-tab" role="tablist">
	    <a className="nav-item nav-link active" id="nav-home-tab" data-toggle="tab" href="#nav-home" role="tab" aria-controls="nav-home" aria-selected="true">Mode</a>
	    <a className="nav-item nav-link" id="nav-options-tab" data-toggle="tab" href="#nav-options" role="tab" aria-controls="nav-profile" aria-selected="false">Options</a>
	    <a className="nav-item nav-link" id="nav-graph-tab" data-toggle="tab" href="#nav-graph" role="tab" aria-controls="nav-contact" aria-selected="false">Graph</a>
	    <div id="tab-controls">
 	    <span id="tab-minmax" className="fas fa-window-minimize"/>
	    </div>
	    </div>
	    </nav> 
	    <div className="tab-content" id="nav-tabContent">
	    <div className="tab-pane fade show active" id="nav-home" role="tabpanel" aria-labelledby="nav-home-tab">
	    <div className="container" style={{text_align:'center'}}>
	    <div className="row">
	    <div className="col">
	    <button type="button" className="btn btn-primary btn-block">DCV</button>
	    </div>
	    <div className="col">
	    <button type="button" className="btn btn-primary btn-block">DCI</button>
	    </div>
	    <div className="w-100"></div>
	    <div className="col">
	    <button type="button" className="btn btn-primary btn-block">ACV</button>
	    </div>
	    <div className="col">
	    <button type="button" className="btn btn-primary btn-block">ACI</button>
	    </div>
	    </div>
	    </div>
	    </div>
	    <div className="tab-pane fade" id="nav-options" role="tabpanel" aria-labelledby="nav-options-tab">
	    <Input/>
	    </div>
	    <div className="tab-pane fade" id="nav-graph" role="tabpanel" aria-labelledby="nav-graph-tab">
	    <div id="graph"></div>
	    </div>
	    </div>
	    </div>
	    </main>
	    </KeyboardProvider>
    );
}

export default App;
