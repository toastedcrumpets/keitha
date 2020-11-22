import React from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { FormControl } from 'react-bootstrap';

const keyboardState = {
  isKeyboardOpen: false,
  closeKeyboard: () => {},
  setKeyboardText: (text) => {},
  keyboardText: "",
};

const KeyboardContext  = React.createContext(keyboardState);

export function KeyboardWidget({children}) {
  const opts = React.useContext(KeyboardContext);
  
  return <>
    <div style={{position:'absolute', bottom:0, left:0, right:0, top:0, opacity:0.5, backgroundColor:'black', display: (opts.isKeyboardOpen ? 'block': 'none')}} onClick={() => opts.closeKeyboard()} /> 
    <div style={{position:'absolute', bottom:0, left:0, right:0, display: (opts.isKeyboardOpen ? 'block': 'none')}} >
      <div className="hg-theme-default">
	<input readOnly autoFocus value={opts.keyboardText} className="hg-button" style={{color:'white', width:'100%'}}/>
      </div>
      <Keyboard onChange={(text) => opts.setKeyboardText(text)}/>
    </div>
  </>;
}

export function KeyboardProvider({children}) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  
  var state = {
    isKeyboardOpen: open,
    closeKeyboard: () => {setOpen(false); },
    setKeyboardText: (text) => {setOpen(true); setText(text);},
    keyboardText: text,
  };

  
  return <KeyboardContext.Provider value={state}>
    {children}
    <KeyboardWidget/>
  </KeyboardContext.Provider>;
}

export function Input({ onChange }) {
  const [text, setText] = React.useState("");
  const [loadKeyboard, setLoad] = React.useState(false);

  const opts = React.useContext(KeyboardContext);

  if (loadKeyboard && (text !== opts.keyboardText))
    setText(opts.keyboardText);
  
  if (loadKeyboard && !opts.isKeyboardOpen) {
    setLoad(false);
    onChange(opts.keyboardText);
  }
  
  return <FormControl as="input" value={text} onChange={(text) => {}} onFocus={() => { setLoad(true); opts.setKeyboardText(text); }}/>;
}
