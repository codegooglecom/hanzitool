/**
 *  漢字構形資料庫 網頁缺字轉換腳本
 *
 *  @Project Home   http://code.google.com/p/hanzitool/
 *  @License        MIT License
 *  @Author         Danny Lin <danny.0838(at)gmail.com>
 */
(function(){
/**
 * Variables
 */
var doc = document;
var _hgz = window.hgz;
var hgz = {};

/**
 * Language Pack
 */
var lang = {
    fail: "出了一點小狀況，轉換沒有完全成功。"
};

/**
 * Configs
 */
var conf = hgz.conf = {
    size: 1.0,  // multiple of style-set
    size_min: 15,  // in pt
    auto: 1  // 1 or 0
};

// 轉移原物件的 config 
if (_hgz && _hgz.conf) { for (var i in _hgz.conf) conf[i] = _hgz.conf[i]; }


/**
 * Sytem Functions
 */
hgz.processPage = function() {
    hgz.processObject(doc.body);
};

hgz.processObject = function(obj) {
    var reg = makeReg();
    replaceText(obj, reg, replace);

    function replaceText(obj, regex, func) {
        if (!obj) return;
        var list = [ obj ];  // 待處理陣列，由後往前，0-based
        var i = 0, j, el, chl, nodename, fail = false;
        do {
            el = list[i];
            if (el.nodeType==3) {
                replaceObjectText(el);
            }
            else if (el.nodeType==1) {
                nodename = el.nodeName.toLowerCase();
                if (nodename == 'frame' || nodename == 'iframe') {
                    var _doc = doc; doc = el.contentDocument;
                    try { replaceText(doc.body, regex, func); } catch(ex) { fail = true; }
                    doc = _doc;
                }
                else if (nodename != "script" && nodename != "style" && nodename != "textarea" && !el.getAttribute('hgz') ) {
                    chl = el.childNodes; j = chl.length;
                    while(j) { list[i++] = chl[--j]; }
                }
            }
        } while (i--);
        if (fail) alert( lang.fail );

        function replaceObjectText(obj) {
            regex.lastIndex = 0;
            var s = obj.nodeValue;
            var m = regex.exec(s);
            if( m !== null ) {
                var replaceLen = m[0].length;
                var newObj = func(m, obj.parentNode);
                obj = obj.splitText( regex.lastIndex - replaceLen );  // Y = X.splitText(index) 會把 X 切成二個 node，執行後 X 為前面的，Y 為後面的
                if ( obj.nodeValue.length > replaceLen ) list[i++] = obj.splitText(replaceLen);
                obj.parentNode.replaceChild( newObj, obj );
            }
        }
    }

    function replace(m, parent) {
        var color = color2hgz(getStyle(parent, 'color'));
        var size = Math.max(size2hgz(getStyle(parent, 'font-size')) * conf.size, conf.size_min);
        var font = font2hgz(getStyle(parent, 'font-family'));
        var alt = m[0];
        var id = text2stylecodes(m[0]);
        if (id) {
            // 風格碼，格式: %xx;%xx;%xx
            var imgurl = 'http://char.ndap.org.tw/API/render_wind.aspx?word=' + id[0] + '&from=' + id[1] + '&appNum=' + id[2] + '&c=' + color + '&s=' + size;
        }
        else {
            var id = text2id(m[0]);
            // 普通碼，格式: xxxx,xxxx,xxxx, 
            var imgurl = 'http://char.ndap.org.tw/API/render.aspx?word=' + id + '&c=' + color + '&s=' + size + '&f=' + font;
        }        
        var img = doc.createElement('IMG');
        img.src = imgurl;
        img.title = img.alt = m[0];
        img.style.border = 'none';
        img.style.verticalAlign = 'text-bottom';
        img.setAttribute("hgz",1);
        return img;
    }
};


hgz.unprocessPage = function() {
    hgz.unprocessObject(doc.body);
};

hgz.unprocessObject = function(obj) {
    var els = obj.getElementsByTagName('IMG'), i=els.length, I, el, els1, pre, post, content, _doc, fail = false;
    while (i--) {
        el = els[i];
        if (el.getAttribute('hgz')!=1) continue;
        content = el.alt;
        if (content) {
            pre = el.previousSibling;
            post = el.nextSibling;
            if (pre && pre.nodeType==3) {
                content = pre.nodeValue + content;
                pre.parentNode.removeChild(pre);
            }
            if (post && post.nodeType==3) {
                content = content + post.nodeValue;
                post.parentNode.removeChild(post);
            }
            el.parentNode.replaceChild( doc.createTextNode(content) , el );
        }
    }
    // 處理頁框
    els = [];
    els1 = obj.getElementsByTagName('FRAME');
    for (i=0,I=els1.length;i<I;++i) els.push(els1[i]);
    els1 = obj.getElementsByTagName('IFRAME');
    for (i=0,I=els1.length;i<I;++i) els.push(els1[i]);
    for (i=0,I=els.length;i<I;++i) {
        el = els[i]; _doc = doc;
        doc = el.contentDocument;
        try { hgz.unprocessObject(doc.body); } catch(ex) { fail = true; }
        doc = _doc;
    }
    if (fail) alert( lang.fail );
}

/**
 * Common Functions
 */
function dechex(n) {
    return n.toString(16).toUpperCase();
}

function text2id(s) {
    var out = '';
    for (var i=0,I=s.length;i<I;++i) {
        out += dechex(s.charCodeAt(i)) + ',';
    }
    return out;
}

function text2stylecodes(s) {
    var a = s.indexOf("");
    if (a<=0) return null;
    var d = s.substring(1, a);
    var e = s.substring(a + 1, s.length - 1);
    var h = e.indexOf(";");
    if (h > 0) {
        var f = e.substring(0, h);
        var g = e.substr(h + 1);
    } else {
        var f = e;
        var g = 1;
    }
    return [ encodeURI(d), encodeURI(f), g ];
}

function getStyle(el, style){
    var result = '';
    if (window.getComputedStyle) {
        // for Firefox, Opera, Chrome, etc
        result = window.getComputedStyle(el, '').getPropertyValue(style);
    }
    else if (el.currentStyle) {
        // for IE 6.0+
        try{
            if (style == 'float') style = 'styleFloat';
            else style = style.replace(/\-(\w)/g, function (strMatch, p1){
                return p1.toUpperCase();
            });
            if (/fontSize/.test(style)) {
                result = getCurrentPixelStyle(el, style);
            }
            else {
                while (el) {
                    result = el.currentStyle[style];
                    if (result=='inherit'||result=='') el =  el.parentNode;
                    else break;
                }
            }
        }
        catch(e){
            // Used to prevent an error in IE 5.0
        }
    }
    return result;
}

function getCurrentPixelStyle(elem, prop) {
    var value = elem.currentStyle[prop] || 0;

    // we use 'left' property as a place holder so backup values
    var _left = elem.style.left;
    var _runtimeLeft = elem.runtimeStyle.left;

    // assign to runtimeStyle and get pixel value
    elem.runtimeStyle.left = elem.currentStyle.left;
    elem.style.left = (prop === "fontSize") ? "1em" : value;
    value = elem.style.pixelLeft + "px";

    // restore values for left
    elem.style.left = _left;
    elem.runtimeStyle.left = _runtimeLeft;

    return value;
}

function color2hgz(s) {
    var result = '';
    var m;
    if ((m=/rgb\((\d+).*?(\d+).*?(\d+)\)/g.exec(s))) {
        for (var i=1;i<=3;++i) {
            m[i] = dechex(parseInt(m[i]));
            if (m[i].length<2) m[i] = '0' + m[i];
            result += m[i];
        }
    }
    else if ((m=/#([0-9A-F])([0-9A-F])([0-9A-F])([0-9A-F])?([0-9A-F])?([0-9A-F])?/ig.exec(s))) {
        if (!m[6]) result = m[1]+m[1]+m[2]+m[2]+m[3]+m[3];
        else result = m[1]+m[2]+m[3]+m[4]+m[5]+m[6];
        result = result.toUpperCase();
    }
    else {
        var list = {
            BLACK: '000000',
            NAVY: '000080',
            DARKBLUE: '00008B',
            MEDIUMBLUE: '0000CD',
            BLUE: '0000FF',
            DARKGREEN: '006400',
            GREEN: '008000',
            TEAL: '008080',
            DARKCYAN: '008B8B',
            DEEPSKYBLUE: '00BFFF',
            DARKTURQUOISE: '00CED1',
            MEDIUMSPRINGGREEN: '00FA9A',
            LIME: '00FF00',
            SPRINGGREEN: '00FF7F',
            AQUA: '00FFFF',
            CYAN: '00FFFF',
            MIDNIGHTBLUE: '191970',
            DODGERBLUE: '1E90FF',
            LIGHTSEAGREEN: '20B2AA',
            FORESTGREEN: '228B22',
            SEAGREEN: '2E8B57',
            DARKSLATEGRAY: '2F4F4F',
            DARKSLATEGREY: '2F4F4F',
            LIMEGREEN: '32CD32',
            MEDIUMSEAGREEN: '3CB371',
            TURQUOISE: '40E0D0',
            ROYALBLUE: '4169E1',
            STEELBLUE: '4682B4',
            DARKSLATEBLUE: '483D8B',
            MEDIUMTURQUOISE: '48D1CC',
            INDIGO : '4B0082',
            DARKOLIVEGREEN: '556B2F',
            CADETBLUE: '5F9EA0',
            CORNFLOWERBLUE: '6495ED',
            MEDIUMAQUAMARINE: '66CDAA',
            DIMGRAY: '696969',
            DIMGREY: '696969',
            SLATEBLUE: '6A5ACD',
            OLIVEDRAB: '6B8E23',
            SLATEGRAY: '708090',
            SLATEGREY: '708090',
            LIGHTSLATEGRAY: '778899',
            LIGHTSLATEGREY: '778899',
            MEDIUMSLATEBLUE: '7B68EE',
            LAWNGREEN: '7CFC00',
            CHARTREUSE: '7FFF00',
            AQUAMARINE: '7FFFD4',
            MAROON: '800000',
            PURPLE: '800080',
            OLIVE: '808000',
            GRAY: '808080',
            GREY: '808080',
            SKYBLUE: '87CEEB',
            LIGHTSKYBLUE: '87CEFA',
            BLUEVIOLET: '8A2BE2',
            DARKRED: '8B0000',
            DARKMAGENTA: '8B008B',
            SADDLEBROWN: '8B4513',
            DARKSEAGREEN: '8FBC8F',
            LIGHTGREEN: '90EE90',
            MEDIUMPURPLE: '9370D8',
            DARKVIOLET: '9400D3',
            PALEGREEN: '98FB98',
            DARKORCHID: '9932CC',
            YELLOWGREEN: '9ACD32',
            SIENNA: 'A0522D',
            BROWN: 'A52A2A',
            DARKGRAY: 'A9A9A9',
            DARKGREY: 'A9A9A9',
            LIGHTBLUE: 'ADD8E6',
            GREENYELLOW: 'ADFF2F',
            PALETURQUOISE: 'AFEEEE',
            LIGHTSTEELBLUE: 'B0C4DE',
            POWDERBLUE: 'B0E0E6',
            FIREBRICK: 'B22222',
            DARKGOLDENROD: 'B8860B',
            MEDIUMORCHID: 'BA55D3',
            ROSYBROWN: 'BC8F8F',
            DARKKHAKI: 'BDB76B',
            SILVER: 'C0C0C0',
            MEDIUMVIOLETRED: 'C71585',
            INDIANRED : 'CD5C5C',
            PERU: 'CD853F',
            CHOCOLATE: 'D2691E',
            TAN: 'D2B48C',
            LIGHTGRAY: 'D3D3D3',
            LIGHTGREY: 'D3D3D3',
            PALEVIOLETRED: 'D87093',
            THISTLE: 'D8BFD8',
            ORCHID: 'DA70D6',
            GOLDENROD: 'DAA520',
            CRIMSON: 'DC143C',
            GAINSBORO: 'DCDCDC',
            PLUM: 'DDA0DD',
            BURLYWOOD: 'DEB887',
            LIGHTCYAN: 'E0FFFF',
            LAVENDER: 'E6E6FA',
            DARKSALMON: 'E9967A',
            VIOLET: 'EE82EE',
            PALEGOLDENROD: 'EEE8AA',
            LIGHTCORAL: 'F08080',
            KHAKI: 'F0E68C',
            ALICEBLUE: 'F0F8FF',
            HONEYDEW: 'F0FFF0',
            AZURE: 'F0FFFF',
            SANDYBROWN: 'F4A460',
            WHEAT: 'F5DEB3',
            BEIGE: 'F5F5DC',
            WHITESMOKE: 'F5F5F5',
            MINTCREAM: 'F5FFFA',
            GHOSTWHITE: 'F8F8FF',
            SALMON: 'FA8072',
            ANTIQUEWHITE: 'FAEBD7',
            LINEN: 'FAF0E6',
            LIGHTGOLDENRODYELLOW: 'FAFAD2',
            OLDLACE: 'FDF5E6',
            RED: 'FF0000',
            FUCHSIA: 'FF00FF',
            MAGENTA: 'FF00FF',
            DEEPPINK: 'FF1493',
            ORANGERED: 'FF4500',
            TOMATO: 'FF6347',
            HOTPINK: 'FF69B4',
            CORAL: 'FF7F50',
            DARKORANGE: 'FF8C00',
            LIGHTSALMON: 'FFA07A',
            ORANGE: 'FFA500',
            LIGHTPINK: 'FFB6C1',
            PINK: 'FFC0CB',
            GOLD: 'FFD700',
            PEACHPUFF: 'FFDAB9',
            NAVAJOWHITE: 'FFDEAD',
            MOCCASIN: 'FFE4B5',
            BISQUE: 'FFE4C4',
            MISTYROSE: 'FFE4E1',
            BLANCHEDALMOND: 'FFEBCD',
            PAPAYAWHIP: 'FFEFD5',
            LAVENDERBLUSH: 'FFF0F5',
            SEASHELL: 'FFF5EE',
            CORNSILK: 'FFF8DC',
            LEMONCHIFFON: 'FFFACD',
            FLORALWHITE: 'FFFAF0',
            SNOW: 'FFFAFA',
            YELLOW: 'FFFF00',
            LIGHTYELLOW: 'FFFFE0',
            IVORY: 'FFFFF0',
            WHITE: 'FFFFFF'
        }
        m = s.toUpperCase();
        for (var i in list) { if (i==m) { result = list[i]; break; } }
        if (!result) result = '000000';
    }
    return result;
}

function font2hgz(s) {
    if (/楷|DFKai/g.test(s)) result = 'DFKai-sb';
    else result = 'Mingliu';
    return result;
}

function size2hgz(s) {
    var result = '';
    if (s.indexOf('px')==-1) s = getCurrentPixelStyle(s);
    if (s.indexOf('px')!=-1) {
        var result = '';
        var reg = /(\d+)/g;
        s = reg.exec(s);
        result = parseInt(parseInt(s) * 72/getScreenPPI()).toString();
    }
    return result;
    
    function getScreenPPI() {
        if (!this.ppi) {
            var tester = document.createElement('DIV');
            tester.style.visibility = 'hidden';
            tester.style.width = '1in';
            tester.style.padding = '0px';
            tester.style.border = '0px';
            document.body.appendChild(tester);
            this.ppi = tester.offsetWidth;
            document.body.removeChild(tester);
        }
        return this.ppi;
    }
}

function makeReg() {
    /**
     *   [0xF6A3, 0xF6A4, 0xF6A5]
     *   [0xF6A6, 0xF6A7, 0xF6A8, 0xF6A9, 0xF6AA, 0xF6AB, 0xF6AC, 0xF6AD]
     *   [0xF6AE, 0xF6AF]
     *   [0xF6B0, 0xF6B1]
     */
    if (true) {
        var reg1 = [
            "(?:[\uF6A6-\uF6AD]?[^\uF6A3-\uF6AF])(?:[\uF6A3-\uF6A5](?:[\uF6A6-\uF6AD]?[^\uF6A3-\uF6AF]))+",
            "[\uF6A6-\uF6AD][^\uF6A3-\uF6AF]",
            "(?:[\uF6A6-\uF6AD]?[^\uF6A3-\uF6AF])+",
            "[\uF6A3-\uF6B0]"
            ];
        reg1 = '(' + reg1.join('|') + ')';
    }
    else var reg1 = "([])";
    /* merge reg# */
    var reg = new RegExp ( [reg1].join('|'), 'g' );
    return reg;
}

function autoProcessPage() {
    if (!conf.auto) return;
    if (doc.body) hgz.processPage();
    else bindEvent(window,'load',arguments.callee);
}

function bindEvent(obj,event,dothis) {
    if (window.addEventListener != undefined) {  // DOM method for binding an event
        obj.addEventListener(event, dothis, false);  // true: capture; false: bubble
    }
    else if (window.attachEvent != undefined) {  // IE exclusive method for binding an event
        obj.attachEvent("on"+event, dothis);
    }
    else if (document.getElementById != undefined && obj==window) {  // support older modern browsers
        window["on"+event]=dothis;
    }
}

/**
 * Init
 */
autoProcessPage();

window.hgz = hgz;
})();
