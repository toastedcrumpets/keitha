import React from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

const keyboardState = {
  onInputFocus:() => {},
  onInputBlur:() => {},   
};

const KeyboardContext  = React.createContext(keyboardState);

export function KeyboardProvider({children}) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  
  var state = {
    keyboardOpen: open,
    onInputFocus: (text) => {setOpen(true); setText(text);},
    keyboardText: text,
  };

  
  return <KeyboardContext.Provider value={state}>
    {children}
    { open ? <div style={{position:'absolute', bottom:0, left:0, right:0, top:0, opacity:0.5, backgroundColor:'black'}} onClick={() => setOpen(false)} /> : null }
    <div style={{position:'absolute', bottom:0, left:0, right:0}} >
      { open ?
	<React.Fragment>
	  <div className="hg-theme-default">
	    <input readOnly autoFocus value={text} className="hg-button" style={{color:'white', width:'100%'}}/>
	  </div>
	  <Keyboard onChange={(text) => setText(text)}/>
	</React.Fragment>
	: null}
    </div>
  </KeyboardContext.Provider>;
}

export function Input({ onChange }) {
  const [text, setText] = React.useState("");
  const [loadKeyboard, setLoad] = React.useState(false);

  return (
    <KeyboardContext.Consumer>
      {({ onInputFocus, keyboardOpen, keyboardText }) => {
	if (loadKeyboard)
	  setText(keyboardText);

	if (loadKeyboard && !keyboardOpen) {
	  setLoad(false);
	  onChange(keyboardText);
	}

	return <input value={text} onChange={(text) => {}} onFocus={() => { onInputFocus(text); setLoad(true);}}/>;
      }}
    </KeyboardContext.Consumer>
  );
}
