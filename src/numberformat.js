

export default function numberformat(num, precision, inc_sign=true) {
  var metricUnitStepsToPrefixSymbol = [
    /*1e-24:*/ 'y', //yocto
    /*1e-21:*/ 'z', //zepto
    /*1e-18:*/ 'a', //atto
    /*1e-15:*/ 'f', //femto
    /*1e-12:*/ 'p', //pico
    /*1e-9: */ 'n',  //nano
    /*1e-6: */ 'μ',  //micro
    /*1e-3: */ 'm',  //milli
    /*1:    */ '\xa0',  //A non-breaking space (nothing)
    /*1e3:  */ 'k',  //kilo
    /*1e6:  */ 'M',  //mega
    /*1e9:  */ 'G',  //giga
    /*1e12: */ 'T',  //tera
    /*1e15: */ 'P',  //peta
    /*1e18: */ 'E',  //exa
    /*1e21: */ 'Z',  //zetta
    /*1e24: */ 'Y',  //yotta
  ];
  
  var sign = (num < 0) ? '-' : '+';
  if (!inc_sign)
    sign = "\xa0";

  num = Math.abs(num);
  const base = Math.log10(num);
  const expo = 3 * Math.round(base / 3);
  var mant = num * 10 ** (-expo);
  var idx = expo/3+8;
  idx = Math.min(Math.max(0,idx), metricUnitStepsToPrefixSymbol.length);
  var SIprefix = metricUnitStepsToPrefixSymbol[idx];

  var signspace = '\xa0';
	if (num === 0) {
  	mant = 0;
	  SIprefix = '\xa0';    
  } else {
  	if ((base - expo) >= 1)
    	signspace = '';
	}
  
  return [sign + signspace + mant.toFixed(precision), SIprefix];
}
