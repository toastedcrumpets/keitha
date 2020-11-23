import React from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { FormControl } from 'react-bootstrap';
import numberformat from './numberformat.js';

import './Keyboard.css';

const keyboardState = {
  isKeyboardOpen: false,
  cancelled:true,
  activateKeyboard: (mode, units, initialState) => {},
  closeKeyboard: () => {},
  setKeyboardText: (text) => {},
  keyboardText: "",
  type:"text",
  units:'',
  scale:'',
  setScale:(val) => {},
};

const KeyboardContext  = React.createContext(keyboardState);

function parseMode(opts) {
  const integer = (opts.mode === "posint") || (opts.mode === "int"),
	float = (opts.mode === "posfloat") || (opts.mode === "float"),
	positive_only = (opts.mode === "posint") || (opts.mode === "posfloat");
  const numeric = float || integer;

  return {
    integer, float, positive_only, numeric,
  };
}

function KeyboardWidget({children}) {
  var layouts = {
    text: [
      '` 1 2 3 4 5 6 7 8 9 0 + - = {bksp}',
      '{tab} q w e r t y u i o p [ ] \\',
      '{lock} a s d f g h j k l ; \'',
      '{shift} z x c v b n m , . / {shift}',
      '{enter} {space} {cancel}'
    ],
    shift_text: [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y U I O P { } |',
      '{lock} A S D F G H J K L : " {enter}',
      '{shift} Z X C V B N M < > ? {shift}',
      '{space} {cancel}'
    ],
    numerical: [
      "{clear} {bksp}",
      "7 8 9 {micro}",
      "4 5 6 {milli}",
      "1 2 3 {unity}",
      "0 . {pm} {kilo}",
      "{enter} {cancel}",
    ]
  };

  var buttonTheme = [
    {
      class: 'action_keys',
      buttons: '{enter} {cancel} {clear} {bksp}',
    },
  ];

  var display = {
    '{enter}': '&nbsp;Ok&nbsp;',
    '{cancel}': 'Back',
    '{clear}': 'Clear',
    '{pm}':'±',
    '{bksp}': '<i class="fas fa-backspace"></i>',
    '{micro}': 'μ',
    '{milli}': 'm',
    '{kilo}': 'k',
    '{unity}': '𝟙',
  }
  
  const keyboard = React.useRef();
  const [shift, setShift] = React.useState(false);

  const opts = React.useContext(KeyboardContext);
  const { integer, float, positive_only, numeric } = parseMode(opts);
  
  var layoutName = "text"
  if (opts.mode === "string") {
    if (shift)
      layoutName = 'shift_text';
  } else if (numeric) {
    layoutName = 'numerical';
    
    if (positive_only)
      buttonTheme.push({
	class: 'disable_key',
	buttons: '{pm}',
      });

    if (integer)
      buttonTheme.push({
	class: 'disable_key',
	buttons: '.',
      });

    if (opts.units === "")
      buttonTheme.push({
	class: 'disable_key',
	buttons: '{micro} {milli} {unity} {kilo}',
      });
    
  }
  
  var close = () => {
    keyboard.current.setInput("");    
    opts.closeKeyboard();
  };
  
  //Handle layout changes when shift is pressed, and other keypresses
  var onKeyPress = (button) => {
    if (button === "{shift}" || button === "{lock}") {
      setShift(!shift);
    }
    
    if (button === "{enter}") {
      close();
    }
    if (button === "{clear}") {
      keyboard.current.setInput("");
      opts.setKeyboardText("");
    }
    if (button === "{cancel}") {
      keyboard.current.setInput("");
      opts.cancelKeyboard();
    }

    if (button === '{micro}')
      opts.setScale("μ");
    if (button === '{milli}')
      opts.setScale("m");
    if (button === '{unity}')
      opts.setScale("");
    if (button === '{kilo}')
      opts.setScale("k");
  };

  var onChange = (text) => {
    var invalid_input = false;
    if (integer) {
      if (positive_only)
	invalid_input = text.search(/^[+]?\d+$/)  < 0;
      else
	invalid_input = text.search(/^[-+]?\d+$/) < 0;
    } else if (float) {
      if (positive_only)
	invalid_input = text.search(/^[0-9]*\.?[0-9]*$/)  < 0;
      else
	invalid_input = text.search(/^[-+]?\d+$/) < 0;
    }

    if (invalid_input) {
      //Reset the result, but only if its changed
      if (opts.keyboardText !== text)
	keyboard.current.setInput(opts.keyboardText);
    } else
      //its valid so store the imput
      opts.setKeyboardText(text);
  };
  

  return <div id="keyboard_wrap" style={{display: (opts.isKeyboardOpen ? 'block': 'none')}} >
    <div id="keyboard_overlay"  onClick={() => close()} />
    <div id="keyboard_container">
      <div className="hg-theme-default">
	<input readOnly autoFocus value={opts.keyboardText+' '+opts.scale+opts.units} className="hg-button" style={{color:'white', width:'100%'}}/>
      </div>
      <Keyboard
	keyboardRef={r => (keyboard.current = r)}
	onChange={onChange}
	onKeyPress={onKeyPress}
	layoutName={layoutName}
	layout={layouts}
	mergeDisplay={true}
	display={display}
	buttonTheme={buttonTheme}
	disableCaretPositioning={true}
      />
    </div>
  </div>;
}

export function KeyboardProvider({children}) {
  const [open, setOpen] = React.useState(false);
  const [cancelled, setCancelled] = React.useState(true); 
  const [text, setText] = React.useState("");
  const [mode, setMode] = React.useState("text"); 
  const [units, setUnits] = React.useState(""); 
  const [scale, setScale] = React.useState(""); 
  
  var state = {
    isKeyboardOpen: open,
    cancelled: cancelled,
    activateKeyboard: (mode, units, initialState) => { setMode(mode); setUnits(units); setScale(""); setText(initialState); setCancelled(false); setOpen(true); },
    closeKeyboard: () => { setOpen(false); },
    cancelKeyboard: () => { setCancelled(true); setOpen(false); },
    setKeyboardText: (text) => { setText(text); },
    keyboardText: text,
    mode:mode,
    units:units,
    scale:scale,
    setScale:setScale,
  };
  
  return <KeyboardContext.Provider value={state}>
    {children}
    <KeyboardWidget/>
  </KeyboardContext.Provider>;
}

export function TouchInput({ onChange, mode, units, value }) {
  const [loadKeyboard, setLoad] = React.useState(false);

  const opts = React.useContext(KeyboardContext);
  const { integer, float, positive_only, numeric } = parseMode(opts);

  var text = value;
  if (integer) 
    text = Number(value)+units;
  if (float)
    text = numberformat(value, 6)+units;
  
  if ((loadKeyboard) && !opts.isKeyboardOpen) {
    setLoad(false);
    if (!opts.cancelled) {
      if (numeric) {
	var val = Number(opts.keyboardText);
	if (opts.scale === 'μ')
	  val *= 1e-6;
	if (opts.scale === 'm')
	  val *= 1e-3;
	if (opts.scale === 'k')
	  val *= 1e3;
	onChange(val);		
      } else {
	onChange(opts.keyboardText);	
      }
      
      onChange(opts.keyboardText);
    }
  }

  return <FormControl as="input" value={text} onChange={(text) => {}} onFocus={() => { setLoad(true); opts.activateKeyboard(mode, units, text); }}/>;
}
