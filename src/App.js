import React, { useState } from 'react';
import './App.css';

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

function TriggerDropdown({trigMode, setTrigMode}) {
    return (
	    <li className='nav-item dropdown'>
	    <span className='nav-link dropdown-toggle' id="trigger-dropdown" data-toggle="dropdown">
	    {TriggerButton({trigMode})}
	</span>
	    <div id='trigger-dropdown-options' className="dropdown-menu">
	    {[0,1,2].map(function(trigMode) {
		return <span key={trigMode} className="dropdown-item" onClick={() => {setTrigMode(trigMode)} }>
		    {TriggerButton({trigMode})}</span>;
	    })}
	    </div>
	    </li>
    );
}

function TopMenu(props) {
    const [trigMode, setTrigMode] = useState(2);

    return (<nav className='navbar navbar-expand-md navbar-dark bg-dark fixed-top'>
	    <ul className="navbar-nav mr-auto">
	    {TriggerDropdown({trigMode, setTrigMode})}
	    </ul>
	    </nav>
	   );
}


function App() {
    return (
	    <TopMenu/>
    );
}

export default App;
