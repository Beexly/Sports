//
var defaultDiacriticsRemovalMap = [
    { 'base': 'A', 'letters': /[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g },
    { 'base': 'AA', 'letters': /[\uA732]/g },
    { 'base': 'AE', 'letters': /[\u00C6\u01FC\u01E2]/g },
    { 'base': 'AO', 'letters': /[\uA734]/g },
    { 'base': 'AU', 'letters': /[\uA736]/g },
    { 'base': 'AV', 'letters': /[\uA738\uA73A]/g },
    { 'base': 'AY', 'letters': /[\uA73C]/g },
    { 'base': 'B', 'letters': /[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g },
    { 'base': 'C', 'letters': /[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g },
    { 'base': 'D', 'letters': /[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g },
    { 'base': 'DZ', 'letters': /[\u01F1\u01C4]/g },
    { 'base': 'Dz', 'letters': /[\u01F2\u01C5]/g },
    { 'base': 'E', 'letters': /[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g },
    { 'base': 'F', 'letters': /[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g },
    { 'base': 'G', 'letters': /[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g },
    { 'base': 'H', 'letters': /[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g },
    { 'base': 'I', 'letters': /[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g },
    { 'base': 'J', 'letters': /[\u004A\u24BF\uFF2A\u0134\u0248]/g },
    { 'base': 'K', 'letters': /[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g },
    { 'base': 'L', 'letters': /[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g },
    { 'base': 'LJ', 'letters': /[\u01C7]/g },
    { 'base': 'Lj', 'letters': /[\u01C8]/g },
    { 'base': 'M', 'letters': /[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g },
    { 'base': 'N', 'letters': /[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g },
    { 'base': 'NJ', 'letters': /[\u01CA]/g },
    { 'base': 'Nj', 'letters': /[\u01CB]/g },
    { 'base': 'O', 'letters': /[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g },
    { 'base': 'OI', 'letters': /[\u01A2]/g },
    { 'base': 'OO', 'letters': /[\uA74E]/g },
    { 'base': 'OU', 'letters': /[\u0222]/g },
    { 'base': 'P', 'letters': /[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g },
    { 'base': 'Q', 'letters': /[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g },
    { 'base': 'R', 'letters': /[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g },
    { 'base': 'S', 'letters': /[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g },
    { 'base': 'T', 'letters': /[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g },
    { 'base': 'TZ', 'letters': /[\uA728]/g },
    { 'base': 'U', 'letters': /[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g },
    { 'base': 'V', 'letters': /[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g },
    { 'base': 'VY', 'letters': /[\uA760]/g },
    { 'base': 'W', 'letters': /[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g },
    { 'base': 'X', 'letters': /[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g },
    { 'base': 'Y', 'letters': /[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g },
    { 'base': 'Z', 'letters': /[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g },
    { 'base': 'a', 'letters': /[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g },
    { 'base': 'aa', 'letters': /[\uA733]/g },
    { 'base': 'ae', 'letters': /[\u00E6\u01FD\u01E3]/g },
    { 'base': 'ao', 'letters': /[\uA735]/g },
    { 'base': 'au', 'letters': /[\uA737]/g },
    { 'base': 'av', 'letters': /[\uA739\uA73B]/g },
    { 'base': 'ay', 'letters': /[\uA73D]/g },
    { 'base': 'b', 'letters': /[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g },
    { 'base': 'c', 'letters': /[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g },
    { 'base': 'd', 'letters': /[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g },
    { 'base': 'dz', 'letters': /[\u01F3\u01C6]/g },
    { 'base': 'e', 'letters': /[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g },
    { 'base': 'f', 'letters': /[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g },
    { 'base': 'g', 'letters': /[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g },
    { 'base': 'h', 'letters': /[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g },
    { 'base': 'hv', 'letters': /[\u0195]/g },
    { 'base': 'i', 'letters': /[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g },
    { 'base': 'j', 'letters': /[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g },
    { 'base': 'k', 'letters': /[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g },
    { 'base': 'l', 'letters': /[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g },
    { 'base': 'lj', 'letters': /[\u01C9]/g },
    { 'base': 'm', 'letters': /[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g },
    { 'base': 'n', 'letters': /[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g },
    { 'base': 'nj', 'letters': /[\u01CC]/g },
    { 'base': 'o', 'letters': /[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g },
    { 'base': 'oi', 'letters': /[\u01A3]/g },
    { 'base': 'ou', 'letters': /[\u0223]/g },
    { 'base': 'oo', 'letters': /[\uA74F]/g },
    { 'base': 'p', 'letters': /[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g },
    { 'base': 'q', 'letters': /[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g },
    { 'base': 'r', 'letters': /[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g },
    { 'base': 's', 'letters': /[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g },
    { 'base': 't', 'letters': /[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g },
    { 'base': 'tz', 'letters': /[\uA729]/g },
    { 'base': 'u', 'letters': /[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g },
    { 'base': 'v', 'letters': /[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g },
    { 'base': 'vy', 'letters': /[\uA761]/g },
    { 'base': 'w', 'letters': /[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g },
    { 'base': 'x', 'letters': /[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g },
    { 'base': 'y', 'letters': /[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g },
    { 'base': 'z', 'letters': /[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g }
];
var matchupScoreVals = [0,2,1,-1,-2,0,0,0,0];

var LineStarProjectionsApp = LineStarProjectionsApp || (function () {
    return {
        init: function (pSport, pSite, pPeriod, premium) {
            sportid = pSport;
            siteId = pSite;
            periodId = pPeriod;
            isPremium = premium ? 1 : 0;
        },
    };
}());

var LineStarUtility = LineStarUtility || (function () {
    return {
        isSmallScreen: function () {
            return (screen.width <= 800);
        },
        parseTime: function (jd) {
            var tzOffset = new Date().getTimezoneOffset();
            var tz = /[0-9]+-([0-9][0-9])([0-9][0-9])\)/
            var re = /-?\d+/;
            var m = re.exec(jd);
            var timezone = tz.exec(jd);
            var ms = parseInt(m[0], 10);
            if (timezone != null) {
                var hours = parseInt(timezone[1], 10);
                var minutes = parseInt(timezone[2], 10);
                ms -= (hours * 3600000);
                ms -= (minutes * 60000);
            }
            return new Date(ms + (tzOffset*60000));
        },
        parseTime2: function (jd) {
            //Date(1456533000000-0700)
            var tzIdx = jd.indexOf("-");
            var timeStr = jd.substring(jd.indexOf('(')+1, tzIdx);
            var ms = parseInt(timeStr, 10) + (3600000 * 3);
            return new Date(ms);
        },
        getRankStr: function(num){
            if(num % 100 >= 11 && num % 100 <= 13)  
                return num + "th";  
            switch(num % 10) {  
                case 1: return num + "st";  
                case 2: return num + "nd";  
                case 3: return num + "rd";  
            }  
            return num + "th";  
		},
        loadSettingInt: function(name, def){
            var val = localStorage.getItem(name);
            if (val === null || val === undefined) {
                val = def;
            } else {
                val = parseInt(val);
            }
            return val;
		},
        loadSettingIntAsBool: function(name, def){
            var val = LineStarUtility.loadSettingInt(name, def);
            return (val == 1) ? true : false;
        },
        loadSettingStr: function(name, def){
            var val = localStorage.getItem(name);
            if (val === null || val === undefined) {
                val = def;
            }
            return val;
		},
        saveSettingInt: function(name, val){
            localStorage.setItem(name, val);
		},
        removeDiacritics: function(str) {
            for (var i = 0; i < defaultDiacriticsRemovalMap.length; i++) {
                str = str.replace(defaultDiacriticsRemovalMap[i].letters, defaultDiacriticsRemovalMap[i].base);
            }
            return str.toLowerCase();
        },
        debounce: function(fn, delay, inScope) {
            var timer = null;
            return function () {
                var context = this, args = arguments;
                clearTimeout(timer);
                timer = setTimeout(function () {
                    if (inScope != null && inScope != undefined) {
                        inScope.$apply(function () {
                            fn(args);
                        });
                    } else {
                        fn.apply(context, args);
                    }
                }, delay);
            };
        },
        stringListToStr: function(strList) {
            var text = '';
            for (var i = 0; i < strList.length; i++) {
                if (i > 0) { text += ", "; }
                text += strList[i];
            }
            return text;
        },
        safeParseFloat: function(val){
            var f = 0;
            try{
                f = parseFloat(val);
			}catch(err){
            
			}
            return f;
        },
        isNumber: function (str) {
            var p = /^\d+\.?\d*$/;
            return p.test(str); 
        },
        round: function(val, prec) {
            var mult = Math.pow(10, prec || 0);
            return Math.round(val * mult) / mult;
        },
        measureStart: function(){
            docViewTop = $(window).scrollTop();
            docViewBottom = docViewTop + $(window).height();
		},
        elementScrolled: function(elem){
            if($(elem).is(":visible")){
                var elemTop = $(elem).offset().top;//+150
                return ((elemTop <= docViewBottom) && ((elemTop+200) >= docViewTop));
            }
            return false;
        },
        elementScrolled2: function (elem) {
            if ($(elem).is(":visible")) {
                var elemTop = $(elem).offset().top;//+150
                return ((elemTop <= docViewBottom) && ((elemTop) >= docViewTop));
            }
            return false;
        },
        elementVisInContainer: function (e, c) {
            var eRect = e[0].getBoundingClientRect();
            var cRect = c[0].getBoundingClientRect();

            return eRect.left < cRect.right;
        },
        isNumeric: function(val) {
            if (typeof val === 'number') return true;
            if (typeof val != "string") return false;
            return !isNaN(val) && !isNaN(parseFloat(val)) 
        },
        openPostUrl: function(url, data) {
            var form = document.createElement("form");
            form.action = url;
            form.method = "POST";
            form.target = "_blank";
            if (data) {
                for (var key in data) {
                    var input = document.createElement("textarea");
                    input.name = key;
                    input.value = typeof data[key] === "object" ? JSON.stringify(data[key]) : data[key];
                    form.appendChild(input);
                }
            }
            form.style.display = 'none';
            document.body.appendChild(form);
            form.submit();
        },
        ensureNumeric: function (val) {
            if (typeof val === 'string' || val instanceof String) {
                val = parseInt(val);
            }
            return val;
        },
        safeFixed: function (val) {
            if (val != null && !isNaN(val)) {
                return val.toFixed();
            }
            return "0";
        },
        intToHex: function(v){
            v = v.toString(16);
            while (v.length < 6) {
                v = "0" + v;
            }
            return '#' + v;
        },
    };
    var docViewTop = 0;
    var docViewBottom = 0;
}());

// ---- consent-aware analytics: pushes a GTM dataLayer event ONLY when the
// visitor granted Statistics consent (fscConsent). GTM forwards these to
// GA4 (custom-event trigger + GA4 event tag - see the GTM/GA4 setup notes
// with the fsc_settings snapshot below). No consent -> no push at all.
window.fscTrack = function (eventName, params) {
    try {
        var c = window.fscConsent && window.fscConsent.get();
        if (!c || !c.statistics) { return; }
        window.dataLayer = window.dataLayer || [];
        var payload = { event: eventName };
        if (params) { for (var k in params) { payload[k] = params[k]; } }
        window.dataLayer.push(payload);
    } catch (e) { }
};

mainLayoutApp.controller("projectionsCtl", function($scope, $http, webService, $filter){
        var vm = this;
        vm.Site = LineStar.Site;
        vm.Sport = LineStar.Sport;
        vm.SportName = "";
        vm.periodData ={};
        vm.periodData.HasTeams = 0;
        vm.Sets = [];
        vm.selectedSlate = null;
        vm.salaryContainer = null; 
        vm.HeadShotNone = '/Portals/0/images/base/playerblank.png';
        vm.HeadShotImgBase = '/Portals/0/images/headshots/small/';
        vm.TeamImgBase = '/Portals/0/images/teams/small/';
        vm.injuryImgArr = ["", "injury_out", "injury_gametimedesc", "injury_questionable", "injury_injuredreserve", "injury_doubtful", "injury_probable", "injury_out", "injury_gametimedesc"];
        vm.starterStatusImgArray = ["","expectedtstarter","starting"];
        vm.salaryListForSelSlate = [];
        vm.hiddenSalariesForSlate = [];
        vm.alertTip = ["", "Weather", "Severe Weather", "Hot", "Cold", "Good Matchup", "Good Matchup", "Bad Matchup", "Bad Matchup", "Postponed", "Starting", "Expected ToStart", "Injury", "Wind Helping", "Wind Hurting", "Good Vegas Odds", "Bad Vegas Odds", "News", "", "Good", "Bad", "Good", "Bad", "Good", "Bad", "Good", "Bad", "Good", "Bad", "Tired", "Perfect"];
        vm.alertImg = ["", "weather", "weathersevere", "playerhot", "playercold", "face_smile", "face_smile", "face_frown", "face_frown", "clock", "starting", "expectedtstarter", "", "windgood", "windbad", "casino_good", "casino_bad", "playernews", "", "cake_good", "cake_bad", "star_good", "star_bad", "thumbup", "thumbdown", "crowd_positive", "crowd_negative", "staff_good", "staff_bad", "tired", "perfect", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
        vm.genMethodImages = ["perfect", "thumbup", "playerhot", "crowd_positive", "star_good", "cake_good", "casino_good", "star_good", "face_smile", "star_good", "star_good", "star_good", "playerhot", "windgood", "face_smile", "casino_good"];
        vm.sorters = [ {Method:-1, Name:'Advanced', Desc: 'Sport Specific Matchup Data. Addtional selectors will appear.', Icon:'sort_value.svg', Sport:0 },
                       {Method:0, Name:'Value', Desc: 'Projection/Salary', Icon:'sort_value.svg', Sport:0},
                       {Method:1, Name:'Salary', Desc: 'Cost of Player on platform', Icon:'sort_salary.svg',Sport:0},
                       {Method:2, Name:'Projection', Desc: 'LineStar Proprietary Projection (editable)', Icon:'sort_projected.svg', Sport:0},
                       {Method:3, Name:'Liked', Desc: 'Number of times a player has been liked.', Sport:0},
                       {Method:4, Name:'Faded', Desc: 'Number of times a player has been faded.', Icon:'sort_faded.svg', Sport:0},
                       {Method:5, Name:'Scored', Desc: 'Actual fantasy points scored', Icon:'sort_scored.svg', Sport:0},
                       {Method:6, Name:'Consistent', Desc: 'How Often The Player Meets or Exceeds Projection', Icon:'sort_confidence.svg', Sport:0},
                       {Method:7, Name:'Chat', Desc: 'The number of player chat comments', Icon:'sort_chat.svg', Sport:0},
                       {Method:8, Name:'Line', Desc: 'Even Strength Line', Sport:6},
                       {Method:8, Name:'Order', Desc: 'Hitter batting order', Sport:3},
                       {Method:9, Name:'PPL', Desc: 'PowerPlay Line', Sport:6},
                       {Method:11, Name:'Ceiling', Desc: 'Maximum Expected Fantasy Pts', Sport: 0 },
                       {Method:29, Name:'Ceiling Value', Desc: 'Finds high ceiling players releative to their current salary.', Sport: 0 },
                       {Method:10, Name:'Floor', Desc: 'Minimum Expected Fantasy Pts', Sport:0},
                       {Method:12, Name:'PPG', Desc: 'Average Fantasy Points (season)', Sport:0},
                       {Method:13, Name:'Tier', Desc: 'What Tier Player Is In', Sport:0},
                       {Method:14, Name:'vs Pos', Desc: 'Defensive Ranking Vs. Position', Sport:0},
                       {Method:15, Name:'Projected Ownership', Desc: 'Projected tournament Ownership % Tonight', Sport:0},
                       {Method:16, Name:'AlertScore', Desc: 'Net Positive Alerts Appearing on Players', Sport:0},
                       {Method:17, Name:'Matchup Data', Desc: 'Various Matchup Stats, Tap To Expand, Green = Good', Sport:0},
                       {Method:18, Name:'Imp Pts', Desc: 'Number of Points Implied the TEAM Will Score Based on Vegas Odds', Sport:0},
                       {Method:19, Name:'Leverage', Desc: 'Leverage (Low Ownership Meets High Projection) Tournament Usage', Sport:0},
                       {Method:20, Name:'Consensus', Desc: 'Consensus Projection (aggregate industry projection)', Sport:0},
                       {Method:28, Name:'Consensus Diff', Desc: 'Consensus minus your projection - positive means the industry is higher on the player than you', Sport:0},
                       {Method:21, Name:'Safety', Desc: 'Safety Score (High Ownership Meets High Projection Scoring) Cash Game Usage', Sport:0},
                       {Method:25, Name:'Actual Ownership', Desc: 'Actual tournament ownership % Tonight', Sport:0},
                       {Method:26, Name: 'Name', Desc: 'Sort by players name', Sport: 0 },
                       {Method:27, Name: 'SIC Score', Desc: 'Sort by players SIC Score', Sport: 1 }];
        vm.gameDictForSlate = {};
        vm.matchupSortId = null;
        vm.isMobileDevice = (isMobileDevice>0);
        vm.playerCardView = LineStarUtility.loadSettingInt("playerCardView", 1);
        vm.hideZeroProj = LineStarUtility.loadSettingInt("hideZeroProj2", 0);
        vm.sortDesc = LineStarUtility.loadSettingInt("sortDesc", 1);
        vm.sortMethod = LineStarUtility.loadSettingInt("sortMethod", 0);
        // persistent lineup sort applied to EVERY set automatically:
        // 3 Default (as optimized - the out-of-box default), 0 Projected, 1 Scored, 2 Owned
        vm.lineupSortMethod = LineStarUtility.loadSettingInt("lineupSortMethod", 3);
        vm.lineupSortMenu = { ShowItem: false };
        vm.colorize = LineStarUtility.loadSettingInt("colorize", 1);
        vm.generateModelVal = LineStarUtility.loadSettingInt("generateModelVal_" + LineStar.Sport, 0);
        // Default is now COLLAPSED on every screen, not just small ones - a
        // desktop first-run opened every row at once, which buries the board
        // under charts before anyone has chosen a player to look at.
        vm.allPlayersExpanded = LineStarUtility.loadSettingIntAsBool("allPlayersExpanded", 0);
        // Until someone has actually WORKED the expander - a row chevron or the
        // expand-all button - the top row opens on load as a worked example, so
        // the control is visible in use rather than something to find. Set for
        // good on the first press of either (see toggleRowExpand /
        // onExpandAllPlayersToggled); a collapsed board with no open row is a
        // deliberate choice at that point, not a missed affordance.
        vm.rowExpandLearned = LineStarUtility.loadSettingIntAsBool("rowExpandLearned", 0);
        // once per PAGE LOAD, not per list rebuild - re-opening row one on every
        // filter and sort would fight the user even before they've learned it
        vm.expandFirstRowPending = !vm.rowExpandLearned;

        vm.markRowExpandLearned = function () {
            if (vm.rowExpandLearned) { return; }
            vm.rowExpandLearned = true;
            vm.expandFirstRowPending = false;
            LineStarUtility.saveSettingInt("rowExpandLearned", 1);
        };
        vm.usev3Opti = (LineStarUtility.loadSettingInt("usev3Opti", 1) == 1) ? true : false;
        //vm.showLeftRightScrollControls = LineStarUtility.loadSettingIntAsBool("showLeftRightScrollControls", 1);
        vm.generateModel = null;
        vm.filter_name = null;
        vm.filter_pos = null;
        vm.filter_posList = null;
        vm.filter_teams = {}
        vm.watchTimer = null;
        vm.toastActive = false;
        vm.toastQueue = [];
        vm.teamsInSlate = [];
        vm.teamsInSlateForStack = [];
        vm.slate_minSal = 0;
        vm.slate_maxSal = 20000;
        vm.slate_salStep = 100;
        vm.filter_maxSalary = 20000;
        vm.filter_minSalary = 0;
        vm.modsToSave = [];
        vm.showProjections = 1;
        vm.static = {shouldShowSportSpecCol0:false,shouldShowSportSpecCol1:false,sportSpecificColName0:'',sportSpecificColName1:'',impColHeaderName:''};
        vm.dynamic = {haveGamesStarted:false,isTieredSlate:false, hasCeilData:false, hasFloorData:false, hasConfData:false};
        vm.showLineupBuilder = 0;
        vm.showOptimizerModels = 0;
        // published for non-Angular callers (the page's chart V1/V2 + size
        // toggles) - angular.element().scope() is unavailable with debug
        // info disabled (FSC_NG_PROD), so they reach the controller here
        window.fscProjM = vm;
        vm.optSettingsOpen = false;   // in-flyout optimizer-settings detail pane (gear two-pane)
        vm.optModelsOpen = false;     // in-flyout model-select detail pane (gear two-pane)
        vm.optStacksOpen = false;     // in-flyout team-stacks detail pane (gear two-pane)
        vm.optStackOptionsOpen = false; // in-flyout per-stack options detail pane (gear two-pane)
        vm.optStackTeamsOpen = false;   // in-flyout team picker for one stack (back -> stacks list)
        vm.optExcludeTeamsOpen = false; // in-flyout include/exclude team picker (back -> optimizer)
        vm.optBuilderOpen = false;      // in-flyout lineup-builder slots (back -> optimizer)

        // Lineup builder placement. Default (false) is the horizontal mini bar
        // in the view toolbar; true docks it as a fixed column down the right
        // side, the way it used to sit. DESKTOP ONLY - every docked rule is
        // behind a min-width media query rather than a JS width check, so a
        // phone simply ignores the flag instead of needing it kept in sync.
        vm.builderDocked = false;
        try { vm.builderDocked = (localStorage.getItem('fscBuilderDocked') === '1'); } catch (e) { }
        vm.toggleBuilderDock = function ($event) {
            if ($event) { $event.stopPropagation(); }
            vm.builderDocked = !vm.builderDocked;
            try { localStorage.setItem('fscBuilderDocked', vm.builderDocked ? '1' : '0'); } catch (e) { }
            // the docked column takes width off the table; re-measure the
            // pinned panel heights and let the charts re-evaluate
            vm.clearTeamsFlyoutSize();
            if (vm.resizeTableDebounce) { vm.resizeTableDebounce(); }
        };
        // Docked column width. Expanded (false) gives each slot a full-width
        // row - avatar, name, position; compact (true) narrows the column to
        // roughly the avatars themselves. Only meaningful while docked.
        vm.builderDockCompact = false;
        try { vm.builderDockCompact = (localStorage.getItem('fscBuilderDockCompact') === '1'); } catch (e) { }
        vm.toggleBuilderDockSize = function ($event) {
            if ($event) { $event.stopPropagation(); }
            vm.builderDockCompact = !vm.builderDockCompact;
            try { localStorage.setItem('fscBuilderDockCompact', vm.builderDockCompact ? '1' : '0'); } catch (e) { }
            vm.clearTeamsFlyoutSize();
            if (vm.resizeTableDebounce) { vm.resizeTableDebounce(); }
        };
        // Which edge the docked column snaps to. Right is the default (where
        // the builder used to live); left suits a second monitor on the right
        // or anyone who reads the table's frozen name column first.
        vm.builderDockLeft = false;
        try { vm.builderDockLeft = (localStorage.getItem('fscBuilderDockSide') === 'left'); } catch (e) { }
        vm.toggleBuilderDockSide = function ($event) {
            if ($event) { $event.stopPropagation(); }
            vm.builderDockLeft = !vm.builderDockLeft;
            try { localStorage.setItem('fscBuilderDockSide', vm.builderDockLeft ? 'left' : 'right'); } catch (e) { }
            vm.clearTeamsFlyoutSize();
            if (vm.resizeTableDebounce) { vm.resizeTableDebounce(); }
        };
        vm.luDlgCompact = false;     // lineups view: compact (last-names-only) rendering; mirrors the page density control (synced once densityMode loads + on setDensityMode)
        vm.hideElementOnClick = null;
        vm.hideClickCnt = 0;
        vm.optimizingLineups = 0;
        vm.likedPlayers = [];
        vm.excludedPlayers = [];
        vm.adjustedPlayers = [];
        vm.expAdjustedPlayers = [];
        vm.showTeamPopupSelector = 0;
        vm.teamPopupSelectorMode = 0;
        vm.showSalaryFilter = 0;
        vm.selectedSorter = null;
        vm.showPopupSettingsPanel = 0;
        vm.showStackFinderPanel = 0;
        vm.showActualOwnership = false;
        vm.contestOwnershipForSlate = null;
        // showHeadshots retired with its setting - sportHasHeadshots is the one
        // remaining switch, and it is false for every sport today.

        // ---- hideable salData columns. Each th/td carries attr-col="<key>";
        // hiding adds a fscHideCol-<key> class to .modules_all and CSS hides
        // both th + td (no per-cell watchers). Persists in localStorage;
        // restore from Settings > Table columns, or the per-header X.
        vm.hiddenCols = {};
        try { vm.hiddenCols = JSON.parse(localStorage.getItem('fscHiddenCols')) || {}; } catch (e) { vm.hiddenCols = {}; }
        vm.columnList = [];
        // authored (default) column order - matches the th source order
        vm.defaultColOrder = ['status', 'chat', 'tier', 'value', 'salary', 'scored', 'proj', 'cons', 'maxexp', 'consdiff', 'time', 'opp', 'vspos', 'ss0', 'ss1', 'consistent', 'floor', 'ceiling', 'range', 'alert', 'avgfp', 'implied', 'qualpos', 'wins', 'top10s', 'maxrounds', 'fightodds', 'matchup', 'sic', 'pown', 'actown', 'leverage', 'safety', 'admin'];
        vm.columnOrder = vm.defaultColOrder.slice();
        vm.colOrderCustomized = false;
        try {
            var savedOrder = localStorage.getItem('fscColOrder');
            if (savedOrder) { vm.columnOrder = JSON.parse(savedOrder) || vm.columnOrder; vm.colOrderCustomized = true; }
        } catch (e) { }
        // make sure every known column key is in the order (covers keys
        // added after a user saved a custom order)
        for (var dci = 0; dci < vm.defaultColOrder.length; dci++) {
            if (vm.columnOrder.indexOf(vm.defaultColOrder[dci]) < 0) { vm.columnOrder.push(vm.defaultColOrder[dci]); }
        }

        vm.applyHiddenCols = function () {
            var el = document.querySelector('.modules_all');
            if (!el) { return; }
            var rm = [];
            for (var i = 0; i < el.classList.length; i++) {
                if (el.classList[i].indexOf('fscHideCol-') === 0) { rm.push(el.classList[i]); }
            }
            for (var j = 0; j < rm.length; j++) { el.classList.remove(rm[j]); }
            for (var key in vm.hiddenCols) {
                if (vm.hiddenCols[key]) { el.classList.add('fscHideCol-' + key); }
            }
        };
        vm.saveHiddenCols = function () {
            try { localStorage.setItem('fscHiddenCols', JSON.stringify(vm.hiddenCols)); } catch (e) { }
        };
        vm.isColHidden = function (key) { return !!vm.hiddenCols[key]; };
        vm.hideCol = function (key) { vm.hiddenCols[key] = true; vm.applyHiddenCols(); vm.saveHiddenCols(); vm.buildHiddenColList(); };
        vm.showCol = function (key) { delete vm.hiddenCols[key]; vm.applyHiddenCols(); vm.saveHiddenCols(); vm.buildHiddenColList(); };
        vm.toggleColVisible = function (key) { if (vm.hiddenCols[key]) { vm.showCol(key); } else { vm.hideCol(key); } };
        vm.showAllCols = function () { vm.hiddenCols = {}; vm.applyHiddenCols(); vm.saveHiddenCols(); vm.buildHiddenColList(); };
        vm.hiddenColCount = function () { var n = 0; for (var k in vm.hiddenCols) { if (vm.hiddenCols[k]) { n++; } } return n; };
        // stable list (key+label) of currently-hidden columns, for the header
        // "N hidden" pill so a hidden column is easy to find and restore without
        // digging into Settings. Rebuilt whenever the hidden set changes.
        vm.hiddenColumnList = [];
        vm.buildHiddenColList = function () {
            var ths = document.querySelectorAll('#salData thead th[attr-col]');
            var list = [];
            for (var i = 0; i < ths.length; i++) {
                var key = ths[i].getAttribute('attr-col');
                if (vm.hiddenCols[key]) {
                    list.push({ key: key, label: (ths[i].textContent || '').replace(/[+×]/g, '').trim() || key });
                }
            }
            vm.hiddenColumnList = list;
        };

        // ---- user column highlights. colHighlights: attr-col -> hex color.
        // Like the hide system: a container class on .modules_all + CSS tints
        // the column, but the color is a per-column CSS variable so each can be
        // different. Tints over the cell's existing color (background-image).
        vm.DEFAULT_HL_COLOR = '#FFC83D';
        vm.colHighlights = {};
        try { vm.colHighlights = JSON.parse(localStorage.getItem('fscColHighlights')) || {}; } catch (e) { vm.colHighlights = {}; }
        vm.saveColHighlights = function () { try { localStorage.setItem('fscColHighlights', JSON.stringify(vm.colHighlights)); } catch (e) { } };
        vm.hexToRgba = function (hex, a) {
            if (!hex) { return 'transparent'; }
            var h = ('' + hex).replace('#', '');
            if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
            var n = parseInt(h, 16);
            if (isNaN(n)) { return 'transparent'; }
            return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
        };
        vm.applyColHighlights = function () {
            var el = document.querySelector('.modules_all');
            if (!el) { return; }
            var rm = [];
            for (var i = 0; i < el.classList.length; i++) { if (el.classList[i].indexOf('fscHlCol-') === 0) { rm.push(el.classList[i]); } }
            for (var j = 0; j < rm.length; j++) { el.classList.remove(rm[j]); }
            for (var key in vm.colHighlights) {
                var c = vm.colHighlights[key];
                if (!c) { continue; }
                el.style.setProperty('--fsc-hl-' + key, vm.hexToRgba(c, 0.30));
                el.classList.add('fscHlCol-' + key);
            }
        };
        vm.isColHighlighted = function (key) { return !!vm.colHighlights[key]; };
        vm.toggleColHighlight = function (key) {
            if (vm.colHighlights[key]) { delete vm.colHighlights[key]; } else { vm.colHighlights[key] = vm.DEFAULT_HL_COLOR; }
            vm.applyColHighlights(); vm.saveColHighlights();
        };
        vm.onColHighlightChanged = function () { vm.applyColHighlights(); vm.saveColHighlights(); };

        // one-time migration: the matchup/alert columns used to have their own
        // settings toggles (showMatchupCol/showAlertsCol). They're now part of
        // the unified column hide system, so fold the old defaults in once -
        // default-hidden on mobile (or wherever that old toggle was off).
        try {
            if (!localStorage.getItem('fscColFlagsMigrated')) {
                if (!LineStarUtility.loadSettingIntAsBool('showMatchupCol', !vm.isMobileDevice ? 1 : 0)) { vm.hiddenCols['matchup'] = true; }
                if (!LineStarUtility.loadSettingIntAsBool('showAlertsCol', !vm.isMobileDevice ? 1 : 0)) { vm.hiddenCols['alert'] = true; }
                vm.saveHiddenCols();
                localStorage.setItem('fscColFlagsMigrated', '1');
            }
        } catch (e) { }

        // one-time default: the Cons Diff column opened up to everyone (it was
        // admin-only) but starts hidden - show it via Settings > Table columns
        // or the "N hidden" pill. Marker-guarded so re-showing it sticks.
        try {
            if (!localStorage.getItem('fscConsDiffDefaulted')) {
                vm.hiddenCols['consdiff'] = true;
                vm.saveHiddenCols();
                localStorage.setItem('fscConsDiffDefaulted', '1');
            }
        } catch (e) { }

        // one-time default (July 2026): MLB's Order column starts hidden -
        // the batting-order badge in the Status column carries the same
        // info. The column keys itself 'order' (not the shared ss0 slot,
        // see the th in ProjectionsLayout_New) so this can't leak into
        // other sports' sport-specific columns.
        try {
            if (!localStorage.getItem('fscOrderColDefaulted')) {
                vm.hiddenCols['order'] = true;
                vm.saveHiddenCols();
                localStorage.setItem('fscOrderColDefaulted', '1');
            }
        } catch (e) { }

        // one-time default trim (July 2026): start the lower-traffic columns
        // hidden so the default table is tighter - Time, Floor, Ceiling, Avg FP
        // (Range covers Floor/Ceiling at a glance). Marker-guarded like consdiff
        // above, so re-showing any of them sticks.
        // Consensus was in this list and no longer is - see the block below.
        try {
            if (!localStorage.getItem('fscLeanColsDefaulted')) {
                vm.hiddenCols['time'] = true;
                vm.hiddenCols['floor'] = true;
                vm.hiddenCols['ceiling'] = true;
                vm.hiddenCols['avgfp'] = true;
                vm.saveHiddenCols();
                localStorage.setItem('fscLeanColsDefaulted', '1');
            }
        } catch (e) { }

        // one-time default (Sep 2026): the SIC score column starts hidden. It is
        // NFL-only (the th carries ng-if="m.Sport==1"), so this key is inert on
        // every other sport and the guard still only runs once. Marker-guarded
        // like the rest, so re-showing it from Settings > Table columns or the
        // "N hidden" pill sticks.
        try {
            if (!localStorage.getItem('fscSicColDefaulted')) {
                vm.hiddenCols['sic'] = true;
                vm.saveHiddenCols();
                localStorage.setItem('fscSicColDefaulted', '1');
			}
		} catch (e) { }

        // one-time reversal (Aug 2026): Consensus is visible by default again.
        // Dropping it from the trim above only helps people who have never run
        // that block - anyone who has still carries hiddenCols['cons'] in
        // localStorage, so clear it once. Runs after the trim so it wins if both
        // fire on the same load. Marker-guarded, so hiding it again sticks.
        try {
            if (!localStorage.getItem('fscConsColShown')) {
                delete vm.hiddenCols['cons'];
                vm.saveHiddenCols();
                localStorage.setItem('fscConsColShown', '1');
            }
        } catch (e) { }

        // One shared scale for the whole slate so every Range bar is comparable:
        // the axis runs from 0 to the slate's top outcome (max ceiling, or an
        // edited projection if higher). Cached by list reference so it's O(1)
        // per row per digest; recomputed only when the slate list changes.
        vm.rangeScaleMax = 1;
        vm.rangeScaleRef = null;
        vm.rangeScaleFor = function (list) {
            if (!list || !list.length) { return vm.rangeScaleMax || 1; }
            if (list === vm.rangeScaleRef && vm.rangeScaleMax > 0) { return vm.rangeScaleMax; }
            vm.rangeScaleRef = list;
            var mx = 0;
            for (var i = 0; i < list.length; i++) {
                var p = list[i];
                var c = parseFloat(p.Ceil); if (c > mx) { mx = c; }
                var pr = parseFloat(p.UserPP); if (pr > mx) { mx = pr; }
                var cn = parseFloat(p.AggProj); if (cn > mx) { mx = cn; }
            }
            vm.rangeScaleMax = mx > 0 ? mx * 1.04 : 1;   // small pad so the top mark isn't flush to the edge
            return vm.rangeScaleMax;
        };

        // does the CURRENT slate have any consensus projections at all? Some
        // sports/slates ship all-zero AggProj (no consensus feed) - the range
        // bar then drops the consensus tick + proj<->cons fill instead of
        // painting placeholder zeros. Cached by list reference, O(1) per call.
        vm._consListRef = null;
        vm._consAny = false;
        vm.slateHasConsensus = function () {
            var list = vm.salaryListForSelSlate || [];
            if (list !== vm._consListRef) {
                vm._consListRef = list;
                vm._consAny = false;
                for (var i = 0; i < list.length; i++) {
                    if (parseFloat(list[i].AggProj) > 0) { vm._consAny = true; break; }
                }
            }
            return vm._consAny;
        };

        // builds the inline "Range" column bar on the shared 0->slateMax scale:
        // the floor->ceiling band, a consensus tick and a your-projection dot,
        // all positioned by absolute value so high/low projections read at a
        // glance. The track between the projection and consensus marks is
        // filled RED when consensus sits below your projection and GREEN when
        // consensus sits above it.
        // ── Range bar (SVG) - port of the RangeBar design: per-player track
        // (floor pinned left, ceiling right), bold projection tick + value,
        // muted consensus tick, FLOOR/CEILING endpoint labels and a
        // "+X vs consensus" delta chip. Two variants:
        //   'full'  (cards) - the whole design; viewBox scaling so text scales
        //                      as a unit with the card width.
        //   default (table) - text-less compact variant: track + ticks at a
        //                      fixed 22px height using percentage x-coords
        //                      (viewBox scaling would squash it in the 140px
        //                      cell); the fsc-range-tip hover flyout carries
        //                      the numbers there.
        // The design's likely-zone band is omitted - no percentile data (it
        // plugs in if the backend ever ships 25th/75th). Colors ride the
        // --range-* tokens (theme-aware). .rangeBar class + data attrs are
        // kept for the hover-tip directive.
        vm.buildRangeBar = function (p, mode) {
            if (!p) { return ''; }
            var floor = parseFloat(p.Floor), ceil = parseFloat(p.Ceil);
            if (!isFinite(floor) || !isFinite(ceil) || ceil <= 0) { return ''; }
            // 0 is a real consensus (show the tick at the floor end) - only a
            // missing/null AggProj (parseFloat -> NaN) hides it. EXCEPT when
            // the whole slate has no consensus feed (every AggProj is 0):
            // those zeros are placeholders, so the tick + the proj<->cons
            // fill are dropped entirely.
            var cons = parseFloat(p.AggProj);
            var proj = parseFloat(p.UserPP);
            if (!isFinite(proj)) { proj = parseFloat(p.PP); }
            if (!isFinite(proj)) { proj = 0; }
            var hasCons = isFinite(cons) && vm.slateHasConsensus();
            var full = (mode === 'full');

            var span = (ceil - floor) || 1;
            var fmt = function (n) { return String(parseFloat(n.toFixed(2))); };
            var t = function (v) { var r = (v - floor) / span; return r < 0 ? 0 : (r > 1 ? 1 : r); };

            // proj<->cons segment color: consensus BELOW your projection paints
            // the gap red, consensus ABOVE paints it green. Softened hues so
            // the fill reads as a band, not an alarm; the CONS value text
            // takes the same color so the two read as one signal.
            var segFill = (cons < proj)
                ? 'var(--range-loss, #e05a5a)'
                : 'var(--range-gain, #2fbf7f)';
            var consFill = (hasCons && cons !== proj) ? segFill : 'var(--range-faint, #5c6678)';

            // points scored: marked once the player's game is underway or
            // final. NOTE: GameDict games (salaryContainer.Games) have no
            // ScoreStatus - started is p.SS > 0 (the same field the V2
            // chart's F_SCORED flag rides) with the game's DateUtc-in-the-
            // past check as backup (the idiom used for game locking).
            var scored = parseFloat(p.PS);
            var started = (parseFloat(p.SS) > 0);
            if (!started && vm.GameDict != null) {
                var game = vm.GameDict[p.GID];
                if (game != null && game.DateUtc) {
                    var gdu = game.DateUtc;
                    if (!gdu.endsWith('Z')) { gdu += 'Z'; }
                    started = Date.parse(gdu) < Date.now();
                }
            }
            var hasScored = (started && isFinite(scored));
            // marker wording/color follows the gameBox status language:
            // LIVE = green while the game runs, FINAL = blue when done
            var isFinal = (parseFloat(p.SS) == 4);
            var scoreLbl = isFinal ? 'FINAL' : 'LIVE';
            var scoreFill = isFinal ? 'var(--fsc-blue, #2563EB)' : 'var(--fsc-green, #10B981)';

            // memo: this builder runs from per-row bindings on EVERY digest -
            // with hundreds of rows that's a lot of string assembly for output
            // that rarely changes. Rebuild only when an input actually moved.
            var rbKey = (full ? 'F' : 'c') + (hasCons ? 'C' : 'n') + '|' + floor + '|' + ceil + '|' + cons + '|' + proj + '|' + scored + '|' + started + '|' + isFinal;
            if (p._rbKey === rbKey) { return p._rbHtml; }

            var h = '<div class="rangeBar rangeBarSvg' + (full ? ' rangeBarFull' : '') + '"' +
                    ' data-floor="' + floor.toFixed(1) + '" data-ceil="' + ceil.toFixed(1) + '"' +
                    ' data-cons="' + (hasCons ? cons.toFixed(1) : '') + '" data-proj="' + proj.toFixed(1) + '"' +
                    ' data-scored="' + (hasScored ? scored.toFixed(1) : '') + '"' +
                    ' data-scorestate="' + (hasScored ? (isFinal ? 'final' : 'live') : '') + '">';

            var aria = 'Projection ' + fmt(proj) + ' on a range from ' + fmt(floor) + ' to ' + fmt(ceil) +
                       (hasCons ? ', consensus ' + fmt(cons) : '') +
                       (hasScored ? ', ' + (isFinal ? 'final' : 'live') + ' score ' + fmt(scored) : '');

            if (full) {
                var W = 360, H = 64, PAD = 16;
                var x = function (v) { return (PAD + t(v) * (W - PAD * 2)).toFixed(1); };
                var yb = 32, trackH = 8;
                h += '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + aria + '">';
                h += '<rect x="' + x(floor) + '" y="' + (yb - trackH / 2) + '" width="' + (W - PAD * 2) + '" height="' + trackH + '" rx="' + (trackH / 2) + '" fill="var(--range-track, #1e2634)"/>';
                if (hasCons && cons !== proj) {
                    // colored fill between the projection and consensus marks
                    var sxF = parseFloat(x(Math.min(cons, proj)));
                    var swF = Math.max(0, parseFloat(x(Math.max(cons, proj))) - sxF);
                    h += '<rect x="' + sxF.toFixed(1) + '" y="' + (yb - trackH / 2) + '" width="' + swF.toFixed(1) + '" height="' + trackH + '" rx="' + (trackH / 2) + '" fill="' + segFill + '"/>';
                }
                if (hasCons) {
                    // tick stops just past the track and the label rides right
                    // under it - high enough that it clears the floor/ceiling
                    // numbers in the bottom corners (they occupy y 50-60)
                    h += '<line x1="' + x(cons) + '" y1="' + (yb - 9) + '" x2="' + x(cons) + '" y2="' + (yb + 5) + '" stroke="var(--range-consensus, #8b96a9)" stroke-width="2"/>';
                    h += '<circle cx="' + x(cons) + '" cy="' + (yb - 9) + '" r="2.5" fill="var(--range-consensus, #8b96a9)"/>';
                    // "CONS" stays small + faint; only the numeric value takes
                    // the segment color. Label x clamps inward so a consensus
                    // at/near the floor (e.g. 0) isn't clipped at the edge
                    var cxT = Math.min(Math.max(parseFloat(x(cons)), PAD + 26), W - PAD - 26);
                    h += '<text x="' + cxT.toFixed(1) + '" y="' + (yb + 16) + '" text-anchor="middle" font-size="11" font-weight="700" letter-spacing="0.05em" fill="var(--range-faint, #5c6678)">' +
                         '<tspan font-size="8.5">CONS</tspan> <tspan fill="' + consFill + '">' + fmt(cons) + '</tspan></text>';
                }
                // proj tick stops at the track's bottom edge (yb + trackH/2) so it
                // never crosses into the larger CONS label below the bar
                h += '<line x1="' + x(proj) + '" y1="' + (yb - 13) + '" x2="' + x(proj) + '" y2="' + (yb + 4) + '" stroke="var(--range-proj, #1fe08a)" stroke-width="3" stroke-linecap="round"/>';
                h += '<circle cx="' + x(proj) + '" cy="' + (yb - 13) + '" r="3.5" fill="var(--range-proj, #1fe08a)"/>';
                h += '<text x="' + x(proj) + '" y="' + (yb - 20) + '" text-anchor="middle" font-size="11" font-weight="700" fill="var(--range-proj, #1fe08a)">' + fmt(proj) + '</text>';
                if (hasScored) {
                    // realized-outcome dot ON the track (drawn last = on top),
                    // with its own label lane (yb+27) so it can't collide with
                    // the CONS label; label x clamps inward so it clears the
                    // floor/ceiling numbers in the bottom corners
                    h += '<circle cx="' + x(scored) + '" cy="' + yb + '" r="4" fill="' + scoreFill + '" stroke="var(--fsc-panel, #fff)" stroke-width="1.5"/>';
                    var sx = Math.min(Math.max(parseFloat(x(scored)), PAD + 34), W - PAD - 34);
                    h += '<text x="' + sx.toFixed(1) + '" y="' + (yb + 27) + '" text-anchor="middle" font-size="11" font-weight="700" letter-spacing="0.05em" fill="' + scoreFill + '">' +
                         '<tspan font-size="8.5">' + scoreLbl + '</tspan> <tspan>' + fmt(scored) + '</tspan></text>';
                }
                // (no FLOOR/CEILING labels or corner values - the hover tip
                // carries both; the aria-label above keeps them for readers)
                h += '</svg>';
            } else {
                // compact: fixed 22px height, percentage x-coords (crisp at any
                // cell width), no text - hover tip supplies the numbers
                var xp = function (v) { return (2.5 + t(v) * 95).toFixed(2) + '%'; };
                h += '<svg width="100%" height="22" role="img" aria-label="' + aria + '">';
                h += '<rect x="2.5%" y="8" width="95%" height="6" rx="3" fill="var(--range-track, #1e2634)"/>';
                if (hasCons && cons !== proj) {
                    // colored fill between the projection and consensus marks
                    var sxC = (2.5 + t(Math.min(cons, proj)) * 95).toFixed(2);
                    var swC = ((t(Math.max(cons, proj)) - t(Math.min(cons, proj))) * 95).toFixed(2);
                    h += '<rect x="' + sxC + '%" y="8" width="' + swC + '%" height="6" rx="3" fill="' + segFill + '"/>';
                }
                if (hasCons) {
                    h += '<line x1="' + xp(cons) + '" y1="5" x2="' + xp(cons) + '" y2="17" stroke="var(--range-consensus, #8b96a9)" stroke-width="2"/>';
                }
                h += '<line x1="' + xp(proj) + '" y1="3" x2="' + xp(proj) + '" y2="19" stroke="var(--range-proj, #1fe08a)" stroke-width="3" stroke-linecap="round"/>';
                if (hasScored) {
                    // realized-outcome dot; the hover tip carries the number
                    h += '<circle cx="' + xp(scored) + '" cy="11" r="3.5" fill="' + scoreFill + '" stroke="var(--fsc-panel, #fff)" stroke-width="1"/>';
                }
                h += '</svg>';
            }
            h += '</div>';
            p._rbKey = rbKey;
            p._rbHtml = h;
            return h;
        };

        // ---- column ordering. The cells are static (not data-driven), so
        // reorder = moving the attr-col th/tds (they're a contiguous tail
        // after the player column) into columnOrder sequence. New rows are
        // reordered at link by the fscColOrder directive; explicit changes
        // (drag/reset) reorder the header + all current rows here.
        vm.saveColumnOrder = function () {
            try { localStorage.setItem('fscColOrder', JSON.stringify(vm.columnOrder)); } catch (e) { }
        };
        vm.reorderRowEl = function (rowEl) {
            if (!rowEl) { return; }
            for (var i = 0; i < vm.columnOrder.length; i++) {
                var c = rowEl.querySelector(':scope > [attr-col="' + vm.columnOrder[i] + '"]');
                if (c) { rowEl.appendChild(c); }
            }
        };
        vm.applyColumnOrder = function () {
            var head = document.querySelector('#salData thead tr');
            if (head) { vm.reorderRowEl(head); }
            var rows = document.querySelectorAll('#salData tbody tr.playerCardRow');
            for (var i = 0; i < rows.length; i++) { vm.reorderRowEl(rows[i]); }
        };
        // A row's ng-if cells (floor/ceiling/range/value/...) aren't in the DOM
        // yet when its directive links - they're inserted on the next digest. So
        // reordering at link time misses them and desyncs the row from the
        // header. Debounce a single reorder of the header + ALL rows to the next
        // macrotask, by which point every cell for the batch exists.
        vm._colReorderTimer = null;
        vm.scheduleColReorder = function () {
            if (!vm.colOrderCustomized || vm._colReorderTimer) { return; }
            vm._colReorderTimer = setTimeout(function () {
                vm._colReorderTimer = null;
                vm.applyColumnOrder();
            }, 0);
        };
        vm.moveColumn = function (src, target, after) {
            var ord = vm.columnOrder.slice();
            var si = ord.indexOf(src);
            if (si < 0) { return; }
            ord.splice(si, 1);
            var ti = (target == null) ? -1 : ord.indexOf(target);
            if (ti < 0) { ord.push(src); } else { ord.splice(after ? ti + 1 : ti, 0, src); }
            vm.columnOrder = ord;
            vm.colOrderCustomized = true;
            vm.saveColumnOrder();
            vm.buildColumnList();
            vm.applyColumnOrder();
        };
        vm.resetColumns = function () {
            vm.hiddenCols = {};
            vm.applyHiddenCols();
            vm.saveHiddenCols();
            vm.buildHiddenColList();
            vm.colHighlights = {};
            vm.applyColHighlights();
            vm.saveColHighlights();
            vm.columnOrder = vm.defaultColOrder.slice();
            vm.colOrderCustomized = false;
            try { localStorage.removeItem('fscColOrder'); } catch (e) { }
            vm.applyColumnOrder();   // restore default order in head + existing rows
            vm.buildColumnList();
        };

        // builds the Settings list from the live header (present columns +
        // labels) ordered by columnOrder; reconciles any new column key
        vm.buildColumnList = function () {
            var ths = document.querySelectorAll('#salData thead th[attr-col]');
            var labels = {}, present = [];
            for (var i = 0; i < ths.length; i++) {
                var key = ths[i].getAttribute('attr-col');
                labels[key] = (ths[i].textContent || '').replace(/[+×]/g, '').trim() || key;
                present.push(key);
                if (vm.columnOrder.indexOf(key) < 0) { vm.columnOrder.push(key); }
            }
            var list = [];
            for (var j = 0; j < vm.columnOrder.length; j++) {
                var k = vm.columnOrder[j];
                if (present.indexOf(k) >= 0) { list.push({ key: k, label: labels[k] }); }
            }
            vm.columnList = list;
        };
        setTimeout(function () {
            vm.applyHiddenCols();
            vm.applyColHighlights();
            vm.buildHiddenColList();
            vm.scheduleColReorder();
        }, 0);
        vm.settingsTab = 0;
        vm.matchupDataSorterColIdx = -1;
        vm.matchupDataSorter = null;
        vm.matchupDataSorterLast = null;
        vm.showAlertsAsStars = LineStarUtility.loadSettingIntAsBool("showAlertsAsStars", 1);
        // Card mode: renders the projections list as a responsive card grid
        // instead of the table (same list/model - the toggle lives next to the
        // density segment). Persisted like the other view prefs.
        // Mobile DEFAULTS to cards (paired with ultra density below) - the
        // table needs sideways scrolling on a phone; a saved choice wins.
        // ---- PER-VIEW view/density prefs ----------------------------------
        // Projections, Stacks and My Lineups each remember their own
        // table/cards choice AND their own density: someone can keep
        // projections on cards while lineups stay a table. vm.cardMode /
        // vm.densityMode remain the ACTIVE values every template binds to;
        // switching views swaps the stored pair in (see the $watch below),
        // so no markup had to change.
        // Legacy single-value keys (fscCardMode / fscDensityMode) are the
        // fallback, so an existing user's current choice carries into all
        // three the first time.
        vm.viewPrefKey = function () {
            if (vm.showLineupsDialog) { return 'lineups'; }
            if (vm.showStacksDialog) { return 'stacks'; }
            return 'proj';
        };
        function loadCardModeFor(key) {
            var v = null;
            try { v = localStorage.getItem('fscCardMode_' + key); } catch (e) { }
            if (v === '0' || v === '1') { return v === '1'; }
            return LineStarUtility.loadSettingIntAsBool('fscCardMode', vm.isMobileDevice ? 1 : 0);
        }
        function loadDensityFor(key) {
            var v = null;
            try { v = localStorage.getItem('fscDensityMode_' + key); } catch (e) { }
            if (v === 'normal' || v === 'compact' || v === 'ultra') { return v; }
            var legacy = null;
            try { legacy = localStorage.getItem('fscDensityMode'); } catch (e) { }
            if (legacy) { return legacy; }
            return vm.isMobileDevice ? 'ultra' : 'compact';
        }

        vm.cardMode = loadCardModeFor('proj');
        vm.setCardMode = function (on) {
            vm.cardMode = on;
            var key = vm.viewPrefKey();
            try { localStorage.setItem('fscCardMode_' + key, on ? '1' : '0'); } catch (e) { }
            LineStarUtility.saveSettingInt('fscCardMode', on ? 1 : 0);   // keep the legacy key as the cross-view default
            window.fscTrack('fsc_setting_change', { fsc_setting: 'view', fsc_value: on ? 'cards' : 'table' });
            // cards host mini charts - render the ones now in view (debounced,
            // so this fires after the ng-if swap has rendered)
            if (vm.chart_debounce) { vm.chart_debounce(); }
        };
        // ---- "New look" tour (desktop): a 4-page dialog that introduces
        // cards view, the V2 chart and dark mode, applying each choice LIVE
        // behind the dialog via the same setters the settings dialog uses.
        // Shown once (localStorage fscNewLookTour); every close path marks it
        // seen so it never nags. Replayable from Settings -> Visuals.
        vm.tourStep = 0;
        vm.startTour = function () {
            vm.showPopupSettingsPanel = 0;   // replay entry lives in settings
            vm.tourStep = 1;
        };
        vm.closeTour = function () {
            vm.tourStep = 0;
            try { localStorage.setItem('fscNewLookTour', '1'); } catch (e) { }
        };
        vm.tourDarkOn = function () {
            return !!(window.FSCTheme && FSCTheme.getEffectiveTheme() === 'dark');
        };
        vm.tourSetDark = function (on) {
            if (window.FSCTheme) { FSCTheme.setTheme(on ? 'dark' : 'light'); }
        };
        // colorblind mode only has a toggle - make the tour's chips idempotent
        vm.tourSetColorblind = function (on) {
            if ((vm.colorblindMode == 1) !== !!on) { vm.onToggleColorblindMode(); }
        };
        // feedback page (last tour step): the JotForm tab is injected outside
        // Angular (and only with Functional consent), so the spotlight class
        // is toggled imperatively; the "open it" helper just clicks the tab.
        vm.hasFeedbackBtn = function () {
            return !!document.querySelector('.jotform-feedback-link');
        };
        vm.openFeedback = function () {
            var el = document.querySelector('.jotform-feedback-link');
            if (el) { el.click(); }
        };
        $scope.$watch(function () { return vm.tourStep; }, function (step) {
            var el = document.querySelector('.jotform-feedback-link');
            if (el) { el.classList.toggle('fscTourSpot', step === 6); }
        });
        // The tour no longer opens on its own. It used to auto-start 1.6s after
        // load for any desktop visitor who hadn't seen it; that whole block is
        // gone, so the only way in is vm.startTour() from Settings -> Visuals.
        //
        // closeTour() still writes the fscNewLookTour flag even though nothing
        // reads it now - kept so the "already seen" state survives if the
        // auto-open is ever restored.

        // full stack list for the "+N" overflow chip's tooltip on lineup
        // cards (the card itself shows only the two biggest stacks so all
        // cards stay the same height). Memoized by TeamStack reference -
        // title bindings evaluate every digest.
        vm.stackListTip = function (lineup) {
            if (lineup == null || lineup.TeamStack == null) { return ''; }
            if (lineup._stkTipRef === lineup.TeamStack) { return lineup._stkTip; }
            var sorted = lineup.TeamStack.slice().sort(function (a, b) { return b.cnt - a.cnt; });
            var parts = [];
            for (var i = 0; i < sorted.length; i++) {
                parts.push((sorted[i].TeamName || '?') + ' ×' + sorted[i].cnt);
            }
            lineup._stkTipRef = lineup.TeamStack;
            lineup._stkTip = parts.join(', ');
            return lineup._stkTip;
        };

        // mobile-only: collapse the stacked toolbar to a slim handle so more of
        // the player list fits on screen (the handle + hiding are CSS, <=800px)
        vm.vtCollapsed = LineStarUtility.loadSettingIntAsBool("fscVtCollapsed", 0);
        vm.toggleVtCollapsed = function () {
            vm.vtCollapsed = !vm.vtCollapsed;
            LineStarUtility.saveSettingInt('fscVtCollapsed', vm.vtCollapsed ? 1 : 0);
        };
        vm.totalLineupCnt = 0;
        vm.showPlayerPopupSelector = false;
        vm.replacingAllLineups = false;
        vm.replacingSet = null;
        vm.replacingLineup = null;
        vm.replacingPlayer = null;
        vm.replacePlayerPos = null;
        vm.replacingPlayerMessage = null;
        vm.showRefreshAlertMsg = false;
        vm.showQueryAnim = true;
        vm.showNoSalaryDataMsg= false;
        vm.isPremium = LineStar.IsPremium;

        // ---- inline subscribe prompts (free users only) ------------------
        // Placed at DECAYING positions rather than a fixed cadence. The player
        // list is NOT truncated for non-premium - the gating is server-side on
        // the values - so an NFL slate is 400+ rows and an "every N rows" rule
        // would stamp 80-100 promos through the page. Googlebot crawls
        // anonymously, i.e. as a free user, so every one of those would land in
        // the rendered HTML as repeated boilerplate too.
        //
        // Four is the cap on purpose: someone who has scrolled past 90 players
        // and ignored four pitches is not converting on the fifth.
        //
        // Keyed by 0-based $index, so sorting and filtering re-place them for
        // free - the positions are list slots, not player identities. An object
        // rather than an array + indexOf because ng-repeat asks per row, per
        // digest, on a list this long.
        vm.inlineCtaByIndex = {
            7:  'Unlock every player\u2019s full projections and advanced data.',
            19: 'Premium members get the complete board, live updates and the lineup optimizer.',
            44: 'Want to try it first? View the past week free \u2014 no signup, just change the date up top.',
            89: 'Get unlimited access to every tool on LineStar, one low price.'
        };

        vm.showInlineCta = function (i) {
            return !vm.isPremium && vm.inlineCtaByIndex[i] != null;
        };

        vm.inlineCtaText = function (i) {
            return vm.inlineCtaByIndex[i] || '';
        };
        vm.IsAdmin = LineStar.IsAdmin;
        // admin/self mode (the floating chip): while admin mode is live, the
        // projection boxes edit the site-wide admin override (p.OverridePP)
        // instead of the user's own projection. Admins start in admin mode
        // (Best Ball parity); session-only, not persisted.
        vm.adminMode = (LineStar.IsAdmin == 1);
        vm.toggleAdminMode = function () { vm.adminMode = !vm.adminMode; };
        vm.overridesToSave = [];
        vm.showTutorialAlert = LineStarUtility.loadSettingIntAsBool("showTutorialAlert", 1);
        vm.filtersAreActive = false;
        vm.activeFiltersText = "";
        vm.autoProgressBuilderSlotFilter = LineStarUtility.loadSettingIntAsBool("autoProgressBuilderSlotFilter", 1);
        vm.manualProgressBuilderSlotFilter = LineStarUtility.loadSettingIntAsBool("manualProgressBuilderSlotFilter", 1);
        vm.showHeaderColumnEveryRow = LineStarUtility.loadSettingIntAsBool("showHeaderColumnEveryRow", 1);
        vm.salaryListForSelSlateALL = [];
        vm.salaryListForSelSlatePosProj = [];
        vm.teamsInSlate = [];
        vm.gameDictForSlate = {};
        vm.showPositionFilter = false;
        vm.positionFilterSlot = null;
        vm.showExcludeCtrl = LineStarUtility.loadSettingIntAsBool("showExcludeCtrlV2", 1);
        // rowActionBar visibility: 1 = always shown (default), 0 = on row hover only
        vm.rabAlwaysVisible = LineStarUtility.loadSettingIntAsBool("rabAlwaysVisible", 1);
        // when on (default), players projected for 0 (not playing) sort LAST in every
        // sortable column instead of by their value (e.g. high salary floating to top)
        vm.zeroProjLast = LineStarUtility.loadSettingIntAsBool("zeroProjLast", 1);
        vm.lineupBuilderVersion = "2";
        vm.lineupBuilderPortal = null;
        vm.reqCacheDict = {};
        vm.showUploadProjections = 0;
        vm.lineupBuilderTab = 1;
        vm.lineupBuilderAdjustedTab = 0;
        vm.helpPopupTab = 0;
        vm.teamStackGlobal = 100;
        vm.showAdjustmentsDialog = 0;
        vm.count_removed = 0;
        vm.count_projAdj = 0;
        vm.count_expAdj = 0;
        vm.TeamDict = {};
        vm.showFilterPanel = 0;
        vm.myFilters = null;
        vm.importFiltError = 0;
        vm.filtExportedMsg = 0;
        //load dynamic columns
        //var json = localStorage.getItem("dataCol0_" + LineStar.Sport + '_' + LineStar.Site);
        //vm.dynamic.dataCol0 = (json != null && json.length>0) ? JSON.parse(json) : {vis:false};
        vm.dynamic.dataCol0 = { vis: false };
        vm.showErrorDiag = false;
        vm.errorTitle = '';
        vm.errorDesc = '';

        var s = vm.Sport;
        vm.showDepth = (s == 1 || s == 10 || s == 11);
        vm.stackingAllowed = (s == 1 || s == 2 || s == 3 || s == 4 || s == 6 || s == 10 || s == 11 || s == 12 || s == 13 || s == 14);
        vm.siteName = (LineStar.Site == 1) ? "DraftKings" : (LineStar.Site == 2) ? "FanDuel" : (LineStar.Site == 4) ? "Yahoo" : "??";
        vm.showVerUpdate = false;
        vm.curVer = "2";

        vm.checkVersion = function () {
            var lastVer = localStorage.getItem('lastVersion');
            if (lastVer != vm.curVer) {
                vm.showVerUpdate = true;
                localStorage.setItem('lastVersion', vm.curVer);
            }
        };
        vm.checkVersion();

        vm.showErrorDialog = function (title, desc, opts) {
            opts = opts || {};
            vm.showErrorDiag = true;

            // 'notice' = it worked, read this anyway. Same dialog, amber
            // instead of red: a run that delivered everything it was asked for
            // should not be shouted at in error colours just because the server
            // had a note about it.
            vm.errorTone = (opts.tone === 'notice') ? 'notice' : 'error';

            // optional second button - 'Optimize anyway' on a blocking preflight,
            // so a client-side check that is wrong in some edge case can never be
            // the last word on whether a run happens
            vm.errorActionLabel = opts.actionLabel || '';
            vm.errorAction = (typeof opts.action === 'function') ? opts.action : null;
            vm.errorTitle = title;
            vm.errorDesc = desc;

            // Five of the six callers build this message by concatenation -
            // prose, then "Most likely causes:", then formatOptiIssues() lines
            // prefixed with a bullet character. Splitting it here lets the
            // dialog render a real list and a real label instead of leaning on
            // white-space:pre-wrap to fake both.
            var lead = [], bullets = [], label = '';
            var lines = String(desc == null ? '' : desc).split('\n');

            for (var i = 0; i < lines.length; i++) {
                var ln = lines[i].replace(/^\s+|\s+$/g, '');
                if (!ln.length) { continue; }
                if (ln.charAt(0) === '\u2022') {
                    bullets.push(ln.replace(/^\u2022\s*/, ''));
				} else {
                    lead.push(ln);
				}
			}

            // a trailing "...:" line is the list's heading, not part of the prose
            if (bullets.length && lead.length && lead[lead.length - 1].slice(-1) === ':') {
                label = lead.pop().slice(0, -1);
			}

            vm.errorLeadText = lead.join(' ');
            vm.errorBulletList = bullets;
            vm.errorBulletsLabel = label || 'Most likely causes';
		};

        vm.runErrorAction = function () {
            var fn = vm.errorAction;
            vm.showErrorDiag = false;
            vm.errorAction = null;   // one shot - never fire twice from a stale dialog
            if (typeof fn === 'function') { fn(); }
		};

        vm.hasUserModifiedMaxExp = function (s) {
            return (s.userMod != null && ((s.userMod.Flags & 4) == 4));
        };

        vm.getMaxExp = function (s, optSettings) {
            if (optSettings == null) {
                optSettings = vm.getOptiSettingsObj();
            }
            var maxExp = 0;
            if (vm.hasUserModifiedMaxExp(s)) {
                maxExp = s.userMod.MaxExp;
            } else {
                maxExp = optSettings.exposuremax.intVal;

                var posList = (optSettings.positionexposurelevelmax != null) ? optSettings.positionexposurelevelmax.list : null;
                if (posList != null && posList.length > 0) {
                    var posArr = (s.POS != null) ? s.POS.split(/[,\/]/) : [];
                    for (var j = 0; j < posList.length; j++) {
                        var itm = posList[j];
                        var m = 0;
                        for (var i = 0; i < posArr.length; i++) {
                            if (itm.Pos == posArr[i]) {
                                maxExp = parseInt(itm.Val);
                                m++;
                                break;
                            }
                        }
                        if (m) { break;}
                    }
                }

                if (s.IsLiked && optSettings.lovedexposure.boolVal) {
                    maxExp = 100;
                }
            }
            return maxExp;
        };

        vm.updateMaxExp = function (s, byVal) {
            var maxExp = LineStarUtility.ensureNumeric(s.MaxExp);
            vm.setMaxExp(s, maxExp + byVal, 0);
        };

        vm.onMaxExpChanged = function (s) {
            var str = s.MaxExp.replace(/\D/g, "");
            if (str == null || str.length == 0) { str = "0" };
            var maxExp = LineStarUtility.ensureNumeric(str);
            vm.setMaxExp(s, maxExp, 0);
        };

        vm.setMaxExp = function (s, val, reset) {
            var mod = vm.findUserMod(s);
            if (reset) {
                if (mod != null) {
                    mod.Flags &= ~4;
                }
                val = vm.getMaxExp(s, null);
            }

            if (val < 0) {
                val = 0;
            }else if (val > 100) {
                val = 100;
            }

            // if (val !== s.MaxExp) {
            s.MaxExp = val;
            s.IsIncluded = (val > 0);

            if (mod == null) {
                mod = vm.findOrCreateUserMod(s);
            }
            if (!reset) {
                mod.Flags |= 4;
            }
            mod.MaxExp = val;
            vm.onPlayerLikeOrExcludeChanged(s);
        };

        vm.resetMaxExp = function (s) {
            vm.setMaxExp(s, 0, 1);
        };
    
        vm.showOptimizerSettings = function (onlyExp) {
            vm.showOnlyExpSettings = onlyExp;
            vm.showLineupSettings = 1;
        };
        // True while any cascaded pane is up. The main pane, the sheet foot and
        // the close button all need this same answer, and an eight-term
        // expression copied into the template three times is one added pane away
        // from disagreeing with itself.
        vm.anyOptPaneOpen = function () {
            return !!(vm.optSettingsOpen || vm.optModelsOpen || vm.optStacksOpen ||
                      vm.optGroupsOpen || vm.optGroupPlayersOpen ||
                      vm.optStackOptionsOpen || vm.optStackTeamsOpen ||
                      vm.optExcludeTeamsOpen || vm.optPosStacksOpen ||
                      vm.optBuilderOpen || vm.optExcludedOpen);
		};

        // gear flyout: open the full settings in the in-place two-pane drawer
        // close every in-flyout detail pane - the mobile sheet's X / drag-close
        // route through this so closing the sheet also unpins an open pane
        vm.closeOptimizerPanes = function () {
            vm.optSettingsOpen = false;
            vm.optModelsOpen = false;
            vm.optStacksOpen = false;
            vm.optStackOptionsOpen = false;
            vm.optStackTeamsOpen = false;
            vm.optExcludeTeamsOpen = false;
            // These three were missing: closing the panel from a Player
            // Groups or Position Stacks pane left its flag set, which kept
            // .lbMiniSettingsPinned on and the panel open.
            vm.optGroupsOpen = false;
            vm.optGroupPlayersOpen = false;
            vm.optPosStacksOpen = false;
            vm.optBuilderOpen = false;
            vm.optExcludedOpen = false;
            if (vm.clearTeamsFlyoutSize) { vm.clearTeamsFlyoutSize(); }
        };
        vm.openOptimizerSettingsPane = function () {
            // NOTE: this must NOT touch showOnlyExpSettings. Both callers
            // (openAdvancedPane / openExposurePane) set it before calling, and
            // resetting it here silently turned the Exposure door into a second
            // Advanced door.
            vm.optModelsOpen = false;
            vm.optStacksOpen = false;
            vm.optStackOptionsOpen = false;
            vm.optStackTeamsOpen = false;
            vm.optExcludeTeamsOpen = false;
            vm.optPosStacksOpen = false;
            // These three were missing: closing the panel from a Player
            // Groups or Position Stacks pane left its flag set, which kept
            // .lbMiniSettingsPinned on and the panel open.
            vm.optGroupsOpen = false;
            vm.optGroupPlayersOpen = false;
            vm.optPosStacksOpen = false;
            vm.optSettingsOpen = true;
        };
        // gear flyout: open the model picker in-place (instead of the modal)
        vm.openOptimizerModelsPane = function () {
            vm.optSettingsOpen = false;
            vm.optStacksOpen = false;
            vm.optStackOptionsOpen = false;
            vm.optStackTeamsOpen = false;
            vm.optExcludeTeamsOpen = false;
            vm.optPosStacksOpen = false;
            // These three were missing: closing the panel from a Player
            // Groups or Position Stacks pane left its flag set, which kept
            // .lbMiniSettingsPinned on and the panel open.
            vm.optGroupsOpen = false;
            vm.optGroupPlayersOpen = false;
            vm.optPosStacksOpen = false;
            vm.optModelsOpen = true;
        };
        // gear flyout: open the team-stacks manager in-place (instead of the modal)
        vm.openTeamStacksPane = function () {
            vm.optSettingsOpen = false;
            vm.optModelsOpen = false;
            vm.optStackOptionsOpen = false;
            vm.optStackTeamsOpen = false;
            vm.optExcludeTeamsOpen = false;
            vm.optPosStacksOpen = false;
            // These three were missing: closing the panel from a Player
            // Groups or Position Stacks pane left its flag set, which kept
            // .lbMiniSettingsPinned on and the panel open.
            vm.optGroupsOpen = false;
            vm.optGroupPlayersOpen = false;
            vm.optPosStacksOpen = false;
            vm.optStacksOpen = true;
        };
        // gear flyout: back out of the per-stack options pane to the stacks list
        vm.closeStackOptionsPane = function () {
            vm.optStackOptionsOpen = false;
            vm.optStacksOpen = true;
            vm.saveStackOptions();
        };
        // The optimizer panel is a centred modal on desktop and a bottom sheet
        // on mobile, so there is no longer a gear-anchored flyout to measure
        // against - the card's width and height are CSS in both. This used to
        // compute both from the trigger's rect (TEAMS_FLY_* constants went with
        // it).
        //
        // Kept as a clearing no-op rather than deleted: its three callers fire
        // on pane-open and on resize, and a card carrying stale inline
        // width/max-height from a prior layout would override the dialog's own
        // sizing. Clearing on those same beats is exactly what's wanted now.
        vm.sizeTeamsFlyout = function () {
            vm.clearTeamsFlyoutSize();
		};
        vm.clearTeamsFlyoutSize = function () {
            var anchor = document.querySelector('.lbMiniSettings');
            if (!anchor) { return; }
            var card = anchor.querySelector('.lbMiniFlyoutCard');
            if (card) { card.style.width = ''; card.style.maxHeight = ''; }
            var fly = anchor.querySelector('.lbMiniFlyout');
            if (fly) { fly.style.top = ''; fly.style.bottom = ''; }
        };
        // deferred a tick so it lands after the digest that swaps panes,
        // i.e. once the card is in whatever state the clear applies to
        vm.sizeTeamsFlyoutSoon = function () {
            window.setTimeout(function () { vm.sizeTeamsFlyout(); }, 0);
        };

        // gear flyout: back out of the per-stack TEAM picker to the stacks list.
        // Nothing to commit on the way out - the checkboxes and Max Exp fields
        // write straight through via onTeamStackingChanged / onTeamStackPctChanged.
        vm.closeStackTeamsPane = function () {
            // back to whichever list opened the picker
            if (vm.teamPopupSelectorMode === vm.POS_STACK_TEAM_MODE) {
                vm.dismissTooltips();
                vm.clearTeamsFlyoutSize();
                vm.editingPosStackRule = null;
                vm.optStackTeamsOpen = false;
                vm.optPosStacksOpen = true;
                return;
            }
            vm.dismissTooltips();
            vm.clearTeamsFlyoutSize();
            vm.optStackTeamsOpen = false;
            vm.optStacksOpen = true;
        };

        // Bootstrap renders tooltips as detached nodes on <body> and removes
        // them on the trigger's own mouseleave/blur. When a click swaps the
        // pane out from under the trigger, that event never fires and the
        // tooltip is left orphaned - floating over whatever replaced it.
        // Call this from any handler that removes its own trigger from the DOM.
        vm.dismissTooltips = function () {
            try {
                var $t = $('[data-toggle="tooltip"]');
                if ($t.tooltip) { $t.tooltip('hide'); }
            } catch (e) { }
            $('.tooltip').remove();   // sweep any already orphaned
        };

        vm.showFilterPopup = function () {
            if (vm.myFilters == null) {
                vm.statFiltersList = [{ n: 'Projection', f: 'UserPP', num: 1 }, { n: 'Salary', f: 'SAL', num: 1 }, { n: 'Value', f: 'VAL', num: 1 }, { n: 'Consenus', f: 'AggProj', num: 1 }, { n: 'pOwn', f: 'Owned', num: 1 }, { n: 'Leverage', f: 'Leverage', num: 1 }, { n: 'Safety', f: 'Safety', num: 1 }, { n: 'OppRank', f: 'OppRank', num: 1 }, { n: 'Floor', f: 'Floor', num: 1 }, { n: 'Ceiling', f: 'Ceil', num: 1 }, { n: 'AlertScore', f: 'Stars', num: 1 }, { n: 'AvgFP', f: 'PPG', num: 1 }, { n: 'VegasImpliedPts', f: 'VegasImplied', num: 1 }, { n: "VegasTotalPts", f: "vegasTotals" }, { n:"VegasLineAbsolute", f:"Game.VegasLineAbs"}, { n: 'HateCount', f: 'HateCount', num: 1 }, { n: 'LoveCount', f: 'LoveCount', num: 1 }, { n: 'Position', f: 'POS', num: 0 }];
                vm.nullFilterModel = { name: 'NO FILTER SELECTED', nullFilter: 1, CanMod: 0 };
                vm.myFilters = [vm.nullFilterModel];
                vm.preLoadedFilters = [];
                vm.activeStatFilterModel = vm.nullFilterModel;
                vm.activeStatFilter = null;
                vm.populateSportStatDict();
                vm.loadActiveStatFilters();
                vm.prePopStatFilters();
            }

            vm.filtExportedMsg = 0;
            vm.importFiltError = 0;
            vm.showFilterPanel = 1;
        };
        vm.closeFilterPopup = function () {
            vm.showFilterPanel = 0;
            vm.importFiltError = 0;
            vm.filtExportedMsg = 0;
        };
    
        vm.saveActiveStatFilters = function () {
            var json = angular.toJson(vm.myFilters);
            localStorage.setItem('custfilters_' + vm.Sport, json);
        };
        vm.saveActiveStatFiltersDeb = LineStarUtility.debounce(vm.saveActiveStatFilters, 1200, null);

        vm.loadActiveStatFilters = function () {
            var json = localStorage.getItem('custfilters_' + vm.Sport);
            if (json != null && json.length > 0) {
                vm.myFilters = JSON.parse(json);

                if (vm.myFilters != null) {
                    for (var i = 0; i < vm.myFilters.length; i++) {
                        if (typeof vm.myFilters[i].sport === 'undefined'){
                            vm.myFilters[i].sport = vm.Sport;
                        }
                    }
                }
            }
        };
        vm.statFilterValChanged = function (filter) {
            vm.filter_debounce();
            vm.saveActiveStatFiltersDeb();
        };
        vm.deleteActiveStatFilter = function () {
            if (vm.activeStatFilter.nullFilter != 1) {
                var idx = vm.myFilters.indexOf(vm.activeStatFilter);
                if (idx >= 0) {
                    vm.myFilters.splice(idx, 1);
                }
            }
            vm.activeStatFilterModel = vm.nullFilterModel;
            vm.activeStatFilter = null;
            vm.filter_debounce();
            vm.saveActiveStatFiltersDeb();
        };
        vm.populateSportStatDict = function () {
            var sd = vm.statFiltersList;
            switch (vm.Sport) {
                case 1:
                case 10:
                case 11:
                    sd.push({ n: 'Depth', f: 'depthOrder', num: 1 });
                    break;
                case 3:
                    sd.push({ n: 'BattingOrder', f: 'LU', num: 1 });
                    break;
                case 6:
                    sd.push({ n: 'Line', f: 'LU', num: 1 });
                    sd.push({ n: 'PPL', f: 'PPL', num: 1 });
                    break;
            }
        };
        vm.getStatFilterFromName = function (n) {
            var sl = vm.statFiltersList;
            for (var i = 0; i < sl.length; i++) {
                if (sl[i].n == n) {
                    return sl[i];
                }
            }
            return null;
        };
        vm.exportStatFilter = function () {
            var json = angular.toJson(vm.activeStatFilterModel);
            navigator.clipboard.writeText(json);
            vm.filtExportedMsg = 1;
        };
        
        vm.importStatFilter = async function () {
            var f = null;
            var json = await navigator.clipboard.readText();
            vm.importStatFilterFromJson(json);
        };
        vm.importStatFilterFromJson = function (json) {
            var f = null;
            if (json != null) {
                try {
                    f = JSON.parse(json);
                } catch (err) { }
                if (f != null && f.groups != null && f.groups.length > 0) {
                    f.nullFilter = 0;
                    f.CanMod = 1;
                    f.name = f.name + " [Imported]";
                    vm.myFilters.push(f);
                    vm.activeStatFilterModel = f;
                    vm.activeStatFilter = f;
                    vm.filter_debounce();
                    vm.saveActiveStatFiltersDeb();
                    vm.importFiltError = 0;
                }
            }
            vm.filtExportedMsg = 0;
            if (f == null) {
                vm.importFiltError = 1;
            }
        };
        vm.prePopStatFilters = function () {
            vm.preLoadedFilters.push(vm.nullFilterModel);
            var f;
            switch (vm.Sport) {
                case 1: {
                    f = { sport: 1, name: 'Better Home/Away Splits', groups: [{ op: "0", cnt: 0, list: [] }] };
                    f.groups[0].list.push({ Mode: "2", StatId: "", Adv: { Id: 'flexSeason', Col: 'Home/Away' }, GT: '1', Val: "", AdvVal: { Id: 'flexSeason', Col: 'FPPG' } });
                    vm.preLoadedFilters.push(f);
                    }
                    break;
                case 2: {
                    f = { sport: 2, name: 'Pace Up Players', groups: [{ op: "0", cnt: 0, list: [] }] };
                    f.groups[0].list.push({ Mode: "1", StatId: "", Adv: { Id: 'gameInfo', Col: 'Proj Mins' }, GT: '1', Val: "15", AdvVal: { Id: '', Col: '' } });
                    f.groups[0].list.push({ Mode: "1", StatId: "", Adv: { Id: 'defOverall', Col: 'Pace Diff' }, GT: '1', Val: "0.1", AdvVal: { Id: '', Col: '' } });
                    vm.preLoadedFilters.push(f);

                    f = { sport: 2, name: 'High FPPM Players', groups: [{ op: "0", cnt: 0, list: [] },{ op: "1", cnt: 0, list: [] }] };
                    f.groups[0].list.push({ Mode: "1", StatId: "", Adv: { Id: 'gameInfo', Col: 'Proj Mins' }, GT: '1', Val: "15", AdvVal: { Id: '', Col: '' } });
                    f.groups[1].list.push({ Mode: "1", StatId: "", Adv: { Id: 'startersL20', Col: 'FPPM' }, GT: '1', Val: "1", AdvVal: { Id: '', Col: '' } });
                    f.groups[1].list.push({ Mode: "1", StatId: "", Adv: { Id: 'reservesL20', Col: 'FPPM' }, GT: '1', Val: "1", AdvVal: { Id: '', Col: '' } });
                    vm.preLoadedFilters.push(f);

                    f = { sport: 2, name: 'Blow out Backups w/ High FPPM', groups: [{ op: "0", cnt: 0, list: [] }] };
                    f.groups[0].list.push({ Mode: "1", StatId: "", Adv: { Id: 'gameInfo', Col: 'Proj Mins' }, GT: '1', Val: "5", AdvVal: { Id: '', Col: '' } });
                    f.groups[0].list.push({ Mode: "0", StatId: "VegasLineAbsolute", Adv: { Id: '', Col: '' }, GT: '1', Val: "10", AdvVal: { Id: '', Col: '' }, Pre: 1 });
                    f.groups[0].list.push({ Mode: "1", StatId: "", Adv: { Id: 'reservesL20', Col: 'FPPM' }, GT: '1', Val: "0.8", AdvVal: { Id: '', Col: '' } });
                    vm.preLoadedFilters.push(f);
                    }
                    break;
                case 3: {
                    f = { sport: 3, name: 'Good BvP', groups: [{ op: "0", cnt: 0, list: [] }] };
                    f.groups[0].list.push({ Mode: "1", StatId: "", Adv: { Id: 'batvspitch', Col: 'PA' }, GT: '1', Val: "3", AdvVal: { Id: '', Col: '' } });
                    f.groups[0].list.push({ Mode: "1", StatId: "", Adv: { Id: 'batvspitch', Col: 'ISO' }, GT: '1', Val: ".300", AdvVal: { Id: '', Col: '' } });
                    vm.preLoadedFilters.push(f);

                    f = { sport: 3, name: 'Underperforming Hitters', groups: [{ op: "0", cnt: 0, list: [] }] };
                    f.groups[0].list.push({ Mode: "2", StatId: "", Adv: { Id: 'seasonBatting', Col: 'FP/PA' }, GT: '1', Val: "", AdvVal: { Id: 'last20Batting', Col: 'FP/PA' } });
                    vm.preLoadedFilters.push(f);

                    } break;
                case 6: {
                    f = { sport: 6, name: 'Better Home/Away Splits', groups: [{ op: "0", cnt: 0, list: [] }] };
                    f.groups[0].list.push({ Mode: "2", StatId: "", Adv: { Id: 'skaterLast20', Col: 'FPPG H/A' }, GT: '1', Val: "", AdvVal: { Id: 'skaterLast20', Col: 'FPPG' } });
                    vm.preLoadedFilters.push(f);

                    f = { sport: 6, name: 'Low Owned + Good Matchup', groups: [{ op: "0", cnt: 0, list: [] }] };
                    f.groups[0].list.push({ Mode: "0", StatId: "pOwn", Adv: { Id: '', Col: '' }, GT: '0', Val: "10", AdvVal: { Id: '', Col: '' }, Pre: 1 });
                    f.groups[0].list.push({ Mode: "1", StatId: "", Adv: { Id: 'oppVsSkaterL5', Col: 'FPPG to Line' }, GT: '1', Val: "40", AdvVal: { Id: '', Col: '' } });
                    vm.preLoadedFilters.push(f);
                    }
                    break;
            }
        };
 
        vm.isPlayerFiltered = function (ps) {
            var ret = false;
            var gPass = 0;

            for (var i = 0; i < vm.activeStatFilter.groups.length; i++) {
                var g = vm.activeStatFilter.groups[i];
                var filtPass = 0;

                for (var j = 0; j < g.list.length; j++) {
                    var row = g.list[j];
                    var rowVal = row.Val;
                    var val = 0;

                    switch (row.Mode) {
                        case "0":
                            var f = vm.getStatFilterFromName(row.StatId);
                            if (f.f.indexOf('.') > 0) {
                                var sp = f.f.split('.');
                                var itm = ps[sp[0]];
                                for (var k = 1; k < sp.length; k++) {
                                    itm = itm[sp[k]];
                                }
                                val = itm;
                            } else {
                                val = ps[f.f];
                            }

                            if (f.num == 1 && (typeof val === 'string' || val instanceof String)) {
                                val = parseFloat(val);
                            }
                            break;
                        case "1":
                        case "2":
                            {
                                var pmd = vm.periodData.MatchupDataDict[row.Adv.Id];
                                if (pmd != null) {
                                    var idx = vm.getMatchupDataColIdxForName(pmd, row.Adv.Col);
                                    if (idx >= 0) {
                                        val = vm.getPlayerMatchupDataEleValBySid(pmd, ps, idx);
                                        if (val == '-') {
                                            val = null;
                                        }
                                    }
                                }
                            }
                            break;
                    }

                    if (row.Mode == "2") {
                        var pmd = vm.periodData.MatchupDataDict[row.AdvVal.Id];
                        if (pmd != null) {
                            var idx = vm.getMatchupDataColIdxForName(pmd, row.AdvVal.Col);
                            if (idx >= 0) {
                                rowVal = vm.getPlayerMatchupDataEleValBySid(pmd, ps, idx);
                                if (rowVal == '-') {
                                    val = null;
                                }
                            }
                        }
                    }

                    if (val != null) {
                        if (row.GT == "1") {
                            if (val >= rowVal) {
                                filtPass++;
                            }
                        } else if (row.GT == "0") {
                            if (val < rowVal) {
                                filtPass++;
                            }
                        } else if (row.GT == "2") {
                            if (val == rowVal) {
                                filtPass++;
                            }
                        } else if (row.GT == "3") {
                            var m = 0;
                            var l = rowVal.split(/[ ,]+/);

                            if (!(typeof val === 'string' || val instanceof String)) {
                                val = "";
                            }
                            val = val.toLowerCase();

                            for (var k = 0; k < l.length; k++) {
                                var v2 = l[k].toLowerCase();
                                if (val == v2 || val.indexOf(v2) >= 0 || v2.indexOf(val) >= 0) {
                                    m = 1;
                                    break;
                                }
                            }
                            if (m>0) {
                                filtPass++;
                            }
                        }
                    }
                }

                if ((g.op == "0" && filtPass == g.list.length) || (g.op == "1" && filtPass > 0)) {
                    gPass++;
                }
            }

            return (gPass < vm.activeStatFilter.groups.length);
        };
        vm.createFilterRow = function (group) {
            group.list.splice(0, 0, { Mode: "0", StatId: "Projection", Adv: { Id: '', Col: '' }, GT: '1', Val: "0", AdvVal: { Id: '', Col: '' } });
            vm.saveActiveStatFiltersDeb();
        };
        vm.createFilterGroup = function () {
            var g = { op: "0", list: [], cnt: vm.activeStatFilter.groups.length };
            vm.createFilterRow(g);
            vm.activeStatFilter.groups.push(g);
        };
        vm.deleteGroup = function (g) {
            var idx = vm.activeStatFilter.groups.indexOf(g);
            if (idx >= 0) {
                vm.activeStatFilter.groups.splice(idx, 1);
            }
            vm.saveActiveStatFiltersDeb();
            vm.filter_debounce();
        };
        vm.createNewStatFilter = function () {
            var newFilt = { sport: vm.Sport, name: 'New Filter #' + vm.myFilters.length, groups: [{ op: "0", cnt: 0, list: [] }], CanMod: 1 };

            vm.activeStatFilter = vm.activeStatFilterModel = newFilt;
            vm.myFilters.splice(0, 0, newFilt);
            vm.createFilterRow(newFilt.groups[0]);
            vm.filter_debounce();
        };
      
        vm.deleteFilterRow = function (g, f) {
            var idx = g.list.indexOf(f);
            if (idx >= 0) {
                g.list.splice(idx, 1);
            }
            vm.saveActiveStatFiltersDeb();
            vm.filter_debounce();
        };

        vm.activeStatFilterChanged = function () {
            vm.importFiltError = 0;
            vm.filtExportedMsg = 0;
            if (vm.activeStatFilterModel == null || vm.activeStatFilterModel.nullFilter == 1) {
                vm.activeStatFilter = null;
            } else {
                vm.activeStatFilter = vm.activeStatFilterModel;
            }
            vm.filter_debounce();
        };

        vm.onFilterDataChanged = function (adv) {
            for (var i = 0; i < vm.periodData.MatchupData.length; i++) {
                var pmd = vm.periodData.MatchupData[i];
                if (adv.Id == pmd.Id) {
                    adv.Col = pmd.Columns[pmd.SortCol];
                    break;
                }
            }
            vm.filter_debounce();
            vm.saveActiveStatFiltersDeb();
        };

        vm.updateSalarySlider = function () {
            vm.salarySlider = {
                minValue: vm.filter_minSalary,
                maxValue: vm.filter_maxSalary, 
                options: {
                    floor: vm.slate_minSal,
                    ceil: vm.slate_maxSal,
                    step: (vm.slate_maxSal > 1000) ? 100 : 1,
                    onChange: function (id) {
                        vm.filter_debounce();
                    },
                    onStart: function (id) { },
                    onEnd: function (id) { },
                    id: "salarySlider",
                }
            };
        };
        vm.updateSalarySlider();

        vm.checkRedirect = function () {
            if (LineStar.SportSiteSet) {
                if (typeof fscInfo !== 'undefined' && fscInfo.sportName != null) {
                    vm.SportName = fscInfo.sportName;
                    localStorage.setItem('lastSport', fscInfo.sportName);
                }
                localStorage.setItem('lastSite', LineStar.Site);
            } else {
                var lastSport = localStorage.getItem('lastSport');
                var lastSite = localStorage.getItem('lastSite');

                if (lastSport != null && lastSport.length > 0 && lastSite != null && lastSite.length > 0) {
                    switch (lastSite) {
                        case "1":
                            lastSite = "DraftKings";
                            break;
                        case "2":
                            lastSite = "FanDuel";
                            break;
                        case "4":
                            lastSite = "Yahoo";
                            break;
                    }

                    window.location.href = window.location.origin + '/Projections/Sport/' + lastSport + '/Site/' + lastSite + '/';
                    return true;
                }
            }
            return false;
        };

        if (vm.checkRedirect()) {
            return;
        }
        vm.swaptimizeDupes = true;
        vm.swaptimizeNewSet = true;
        // swaptimizeOnlyLocked retired - the per-game lock list replaced it, and
        // swapOnlyUnlockedFlag() derives this endpoint's single boolean from it

        // Which engine swaps. Independent of usev3Opti once chosen, but the
        // FIRST run inherits it: someone already using V4 to build should not
        // silently drop back to Classic the moment they swap.
        vm.swaptimizeUseV4 = (function () {
            var v = null;
            try { v = localStorage.getItem('fscSwapV4_' + LineStar.Sport); } catch (e) { }
            return (v == null) ? !!vm.usev3Opti : (v === '1');
		}());

        vm.setSwaptimizeEngine = function (useV4) {
            vm.swaptimizeUseV4 = !!useV4;
            try { localStorage.setItem('fscSwapV4_' + LineStar.Sport, vm.swaptimizeUseV4 ? '1' : '0'); } catch (e) { }
		};
        vm.swaptimizeSet = null;
        vm.showSwaptimizeDiag = 0;
        // ══ Which games are locked ════════════════════════════════════════════
        // Replaces the single "Late Swaptimize Only" checkbox. That was one
        // boolean standing in for "whatever has already started", with no way to
        // see what it had decided or to disagree with it.
        //
        // Every game on the slate is listed with its own lock. The clock sets the
        // default - a game that has started is locked, because the site will not
        // accept a change to it - and the user can override either way.
        //
        // Overrides survive closing and reopening the dialog (in memory, per
        // session), but the AUTO state is recomputed every time it opens: games
        // start while the dialog is shut.
        vm.swapGames = [];
        vm.swapGameOverrides = {};      // gameId -> 1 locked / 0 unlocked

        vm.gameHasStarted = function (g) {
            if (g == null || !g.DateUtc) { return false; }
            var s = g.DateUtc;
            if (!s.endsWith('Z')) { s += 'Z'; }     // server sends UTC without the marker
            return Date.parse(s) < Date.now();
		};

        vm.swapGameTimeStr = function (g) {
            if (g == null || !g.DateUtc) { return ''; }
            var s = g.DateUtc;
            if (!s.endsWith('Z')) { s += 'Z'; }
            var d = new Date(Date.parse(s));
            if (isNaN(d.getTime())) { return ''; }

            var h = d.getHours(), m = d.getMinutes();
            var ap = (h < 12) ? 'am' : 'pm';
            h = h % 12; if (h === 0) { h = 12; }
            return h + ':' + (m < 10 ? '0' : '') + m + ap;
		};

        vm.buildSwapGames = function (set) {
            vm.swapGames = [];
            if (set == null || !vm.periodData.HasTeams) { return; }

            var slate = vm.getSlate(set.SetInfo.SlateId);
            if (slate == null || !(slate.SlateGames instanceof Array)) { return; }

            for (var i = 0; i < slate.SlateGames.length; i++) {
                var g = vm.GameDict[slate.SlateGames[i].GameId];
                if (g == null) { continue; }

                var started = vm.gameHasStarted(g);
                var ov = vm.swapGameOverrides[g.GameId];

                vm.swapGames.push({
                    gameId: g.GameId,
                    away: g.AwayTeam, home: g.HomeTeam,
                    awayId: g.AwayTeamId, homeId: g.HomeTeamId,
                    time: vm.swapGameTimeStr(g),
                    started: started,
                    locked: (ov != null) ? (ov === 1) : started,
                    manual: (ov != null)
				});
			}
		};

        vm.toggleSwapGame = function (g) {
            if (g == null) { return; }
            g.locked = !g.locked;
            // an override that lands back on what the clock says is not an
            // override any more - drop it so the game resumes tracking
            if (g.locked === g.started) {
                delete vm.swapGameOverrides[g.gameId];
                g.manual = false;
			} else {
                vm.swapGameOverrides[g.gameId] = g.locked ? 1 : 0;
                g.manual = true;
			}
		};

        vm.resetSwapGameLocks = function () {
            vm.swapGameOverrides = {};
            for (var i = 0; i < vm.swapGames.length; i++) {
                vm.swapGames[i].locked = vm.swapGames[i].started;
                vm.swapGames[i].manual = false;
			}
		};

        vm.swapLockedCount = function () {
            var n = 0;
            for (var i = 0; i < vm.swapGames.length; i++) { if (vm.swapGames[i].locked) { n++; } }
            return n;
		};

        // Started, but the user has unlocked it anyway. This is the one that
        // costs something: the site will refuse a change to a player whose game
        // is underway, so those rows come back rejected on upload.
        vm.swapStartedUnlocked = function () {
            var n = 0;
            for (var i = 0; i < vm.swapGames.length; i++) {
                var g = vm.swapGames[i];
                if (g.started && !g.locked) { n++; }
			}
            return n;
		};

        // Not started, but locked by hand. Always safe - it just narrows the
        // pool - and it is the half Classic cannot express (see below).
        vm.swapEarlyLocked = function () {
            var n = 0;
            for (var i = 0; i < vm.swapGames.length; i++) {
                var g = vm.swapGames[i];
                if (!g.started && g.locked) { n++; }
			}
            return n;
		};

        // The Classic endpoint takes ONE boolean, SwapOnlyUnlocked, and decides
        // for itself which players that covers by game time. So a hand-locked
        // game that has not started cannot be honoured there - only V4's
        // per-lineup locked[] can carry that. This is the closest honest
        // mapping, and the dialog says so when the two disagree.
        vm.swapOnlyUnlockedFlag = function () {
            return vm.swapStartedUnlocked() === 0;
		};

        vm.swapClassicLoses = function () {
            return !vm.usev3Opti && (vm.swapEarlyLocked() > 0 || vm.swapStartedUnlocked() > 0);
		};

        vm.onSwaptimizeSet = function (set) {
            if (set == null) {
                vm.showtoast('Set was not found');
                return;
            }

            vm.swaptimizeSet = set;
            // rebuilt on every open: games start while the dialog is shut, and
            // the auto lock has to reflect the clock as it is now
            vm.buildSwapGames(set);
            vm.showSwaptimizeDiag = 1;
        };
        vm.onSwaptimizeSetStart = function () {
            var set = vm.swaptimizeSet;
            if (set.needsSave==1) {
                vm.showtoast('Set is not saved yet, please try again in a moment.');
                return;
            }
            if (set.actionLocked) {
                vm.showtoast('An action on this set is taking place, please try again in a moment.');
                return;
            }

            // Nothing to swap when every game is locked. The old version
            // recomputed the clock here in its own loop; the lock list already
            // knows, and it knows about the user's overrides too - which the
            // clock does not.
            if (vm.periodData.HasTeams && vm.swapGames.length > 0) {
                if (vm.swapLockedCount() === vm.swapGames.length) {
                    vm.showtoast('Every game is locked, so there is nothing to swap. Unlock a game to continue.');
                    return;
				}
			}

            vm.showSwaptimizeDiag = 0;
            set.actionLocked = true;

            // V4 owns the whole run for a late swap - it builds the destination
            // set itself, matches results back by entryId and handles the
            // original-set removal, none of which the Classic callback below
            // knows how to do.
            if (vm.swaptimizeUseV4) {
                set.actionLocked = false;
                vm.onLineupOptimizeV4(set.SetInfo.LocalId, null);
                return;
			}

            vm.onLineupOptimize(set.SetInfo.LocalId, function (newSet) {
                set.actionLocked = false;
                if (!vm.swaptimizeNewSet && newSet != null) {
                    var idx = vm.periodData.Sets.indexOf(set);
                    if (idx >= 0) {
                        vm.periodData.Sets.splice(idx, 1);
                        vm.updateLineupSetCounts();
                    }
                }
            });
        };
        vm.showOptoSettings = function () {
            vm.showSwaptimizeDiag = 0;
            vm.lineupBuilderTab = 2;
            vm.showLineupBuilder = 1;
        };
    
        vm.onShowPositionFilter = function (slot) {
            if (!slot.req.CanModifyPositions) { return;}

            vm.positionFilterSlot = slot;
            vm.showPositionFilter = true;
        };

        vm.loadLineupRequirementCache = function () {
            var slate = vm.selectedSlate;
            if (slate == null) { return; }
            var reqs = slate.LineupRequirements;

            vm.reqCacheDict = {};

            for (var i = 0; i < reqs.length; i++) {
                var r = reqs[i];
                var savedReqs = null;
                var positions = r.Positions.split(',');
                r.CanModifyPositions = positions.length > 1;

                var data = vm.reqCacheDict[r.PositionName];
                if (data != null) {
                    r.Data = data;
                    continue;
                }
                r.Data = vm.reqCacheDict[r.PositionName] = { 'PosList': [], 'PositionNameDisp': r.PositionName, 'activeFilters': 0};
                r.ReqKey = 'slot_' + vm.Sport + '_' + slate.Mode + '_' + r.PositionName;

                if (r.CanModifyPositions) {
                    var saved = localStorage.getItem(r.ReqKey);
                    savedReqs = (saved != null && saved.length > 0) ? saved.split(',') : [];
                }

                var activePos = [];
                
                for (var j = 0; j < positions.length; j++) {
                    var act = false;

                    if (savedReqs != null) {
                        for (var k = 0; k < savedReqs.length; k++) {
                            if (savedReqs != null && savedReqs[k] == positions[j]) {
                                act = true;
                                activePos.push(positions[j]);
                                break;
                            }
                        }
                    }

                    r.Data.PosList.push({ 'Pos': positions[j], 'Active': act });
                }

                if ((r.Data.activeFilters = activePos.length) > 0) {
                    r.Data.PosListStr = activePos.join(",");
                    r.Data.PositionNameDisp = r.Data.PosListStr + "*";
                }
            }
        };

        vm.setSlotFilter = function (pos) {
            if (pos != null) {
                pos.Active = !pos.Active;
            }
            var req = vm.positionFilterSlot.req;
            var activePos = [];
            var posList = req.Data.PosList;

            for (var i = 0; i < posList.length; i++) {
                if (pos == null) {
                    posList[i].Active = false;
                }
                if (posList[i].Active) {
                    activePos.push(posList[i].Pos);
                }
            }

            req.Data.activeFilters = activePos.length;

            var posStr = activePos.join(",");
            req.Data.PositionNameDisp = (activePos.length > 0) ? posStr + "*" : req.PositionName;
            req.Data.PosListStr = posStr;

            localStorage.setItem(req.ReqKey, posStr);
        };

        vm.showTeamFilterPopup = function(){
            vm.teamPopupSelectorMode = 1;
            vm.showTeamPopupSelector = 1;
        };

        // the top game bar lives in the wrapper (mainLayoutCtrl/mlc); clicking a
        // gameBox broadcasts down to this child scope to open the team filter.
        $scope.$on('fscOpenTeamFilter', function (evt, game) {
            vm.showTeamFilterPopup();
        });

        // Opt in to the game bar's filter menu. The wrapper hides those menu
        // items unless a page registers here, so a page without a team filter
        // simply doesn't advertise them (fscInfo.vm is mainLayoutCtrl's vm).
        //
        // IsDisplayed on teamsInSlate is the source of truth - onTeamFilterChanged
        // rebuilds filter_teams from it, syncs the game-bar highlight and kicks
        // the debounce. Setting it wholesale REPLACES the team selection and
        // leaves every other filter (position, salary, name) untouched.
        if (fscInfo.vm && fscInfo.vm.registerGameFilter) {
            fscInfo.vm.registerGameFilter(function (game, which) {
                if (!game || !vm.teamsInSlate) { return; }
                var i, want = {};
                if (which !== 'home') { want[game.AwayTeamId] = true; }
                if (which !== 'away') { want[game.HomeTeamId] = true; }
                // the game bar shows the whole period, not just this slate -
                // without this the tap would clear every team and filter to nothing
                var inSlate = false;
                for (i = 0; i < vm.teamsInSlate.length; i++) {
                    if (want[vm.teamsInSlate[i].Id]) { inSlate = true; break; }
                }
                if (!inSlate) { return; }
                for (i = 0; i < vm.teamsInSlate.length; i++) {
                    vm.teamsInSlate[i].IsDisplayed = !!want[vm.teamsInSlate[i].Id];
                }
                vm.onTeamFilterChanged();
            });
        }

        vm.onV3OptiChanged = function () {
            LineStarUtility.saveSettingInt("usev3Opti", vm.usev3Opti ? 1 : 0);
            // this toggle adds/removes the Max Exp column (ng-if="usev3Opti"). When
            // it re-appears it lands at its source position, so re-apply the saved
            // column order to put it back where the user placed it (no-op unless
            // the order is customized; runs after the digest re-renders the cells).
            if (vm.scheduleColReorder) { vm.scheduleColReorder(); }
        };

        vm.onDismissTutorialAlert = function(){
            vm.showTutorialAlert = false;
            LineStarUtility.saveSettingInt("showTutorialAlert", 0);
		};


        /*vm.onToggleShowLeftRightSliders = function(){
            vm.showLeftRightScrollControls = !vm.showLeftRightScrollControls;
            LineStarUtility.saveSettingInt("showLeftRightScrollControls", vm.showLeftRightScrollControls ? 1 : 0);
		};*/

        vm.onToggleManaulProgressBuilderSlotFilter = function(){
            vm.manualProgressBuilderSlotFilter = !vm.manualProgressBuilderSlotFilter;
            LineStarUtility.saveSettingInt("manualProgressBuilderSlotFilter", vm.manualProgressBuilderSlotFilter ? 1 : 0);
		};

        vm.onToggleAutoProgressBuilderSlotFilter = function(){
            vm.autoProgressBuilderSlotFilter = !vm.autoProgressBuilderSlotFilter;
            LineStarUtility.saveSettingInt("autoProgressBuilderSlotFilter", vm.autoProgressBuilderSlotFilter ? 1 : 0);
		};

        vm.onToggleShowHeaderColumnEveryRow = function(){
            vm.showHeaderColumnEveryRow = !vm.showHeaderColumnEveryRow;
            LineStarUtility.saveSettingInt("showHeaderColumnEveryRow", vm.showHeaderColumnEveryRow ? 1 : 0);
		}

        // Chart V1/V2 selection — persistence + chart re-render live in
        // the page-level fscSetChartVersion helper (ProjectionsLayout_New
        // .cshtml). These wrappers expose the global state to the
        // settings dialog's Angular bindings.
        vm.chartV2 = function () {
            return !!window.FSC_CHART_V2;
        };
        vm.onSetChartVersion = function (useV2) {
            window.fscTrack('fsc_setting_change', { fsc_setting: 'chart', fsc_value: useV2 ? 'v2' : 'v1' });
            if (typeof window.fscSetChartVersion === 'function') {
                window.fscSetChartVersion(!!useV2);
            }
        };

        // Appearance (light/dark theme + text size) — renders FSCTheme's
        // segmented controls into the settings dialog. Called via ng-init
        // on the container, which re-runs each time ng-if recreates the
        // panel; setTimeout defers until the element is actually in the
        // DOM. FSCTheme is loaded globally by the skin (Header.ascx).
        vm.initThemeControls = function () {
            setTimeout(function () {
                var el = document.getElementById('fscThemeControls');
                if (!el) { return; }
                if (window.FSCTheme) {
                    FSCTheme.buildControls(el);
                } else {
                    // theme.js not loaded (non-standard skin / blocked
                    // asset) - hide the whole Appearance row rather than
                    // showing a label with no controls
                    var row = el.closest ? el.closest('.ps-row') : null;
                    if (row) { row.style.display = 'none'; }
                }
            }, 0);
        };

        // ---- main view switcher. Projections (1) is the only on-page
        // view now; My Lineups (0) and Stacks (2) are movable dialog
        // overlays that float over it, so they toggle rather than swap
        // showProjections.
        vm.switchView = function (v) {
            if (v === 0) { vm.toggleLineupsDialog(); return; }
            if (v === 2) { vm.toggleStacksDialog(); return; }
            if (v === vm.showProjections) { return; }
            vm.showProjections = 1;
            setTimeout(function () { vm.resizeTable(); }, 750);
        };

        // The salary rzslider sits in an initially-hidden popover on the
        // toolbar filter row; force a re-render once the shared clickToOpen
        // handler shows it so the handles land on the right pixels.
        vm.onSalaryPopOpened = function () {
            setTimeout(function () { try { $scope.$broadcast('rzSliderForceRender'); } catch (e) { } }, 0);
        };

        // count summary for the Adjustments chip badge, e.g. "3 Liked · 2 Excl";
        // empty string (falsy) hides the badge when nothing is adjusted
        vm.adjSummary = function () {
            var parts = [];
            if (vm.count_liked > 0) { parts.push(vm.count_liked + ' Liked'); }
            if (vm.count_removed > 0) { parts.push(vm.count_removed + ' Excl'); }
            if (vm.count_projAdj > 0) { parts.push(vm.count_projAdj + ' Proj'); }
            if (vm.count_expAdj > 0) { parts.push(vm.count_expAdj + ' Exp'); }
            return parts.join(' · ');
        };

        // ---- Adjustments popover "Manage" expanders (replaces the old
        // vsLikedPill and the per-type destructive Clear buttons): remove a
        // whole adjustment type or individual players. kind: 0=liked,
        // 1=excluded, 2=proj-adjusted, 3=exposure-adjusted. adjManageList
        // returns the LIVE maintained array for the open kind (stable
        // reference, so ng-repeat digests cleanly and removals splice out
        // in place).
        vm.adjManageKind = null;
        vm.toggleAdjManage = function (kind) {
            vm.adjManageKind = (vm.adjManageKind === kind) ? null : kind;
        };
        vm.adjManageList = function () {
            switch (vm.adjManageKind) {
                case 0: return vm.likedPlayers;
                case 1: return vm.excludedPlayers;
                case 2: return vm.adjustedPlayers;
                case 3: return vm.expAdjustedPlayers;
            }
            return [];
        };
        vm.adjRemovePlayer = function (p) {
            var k = vm.adjManageKind;
            if (k === 0) { vm.onUnlikePlayer(p); return; }
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a premium LineStar member to do this.');
                return;
            }
            if (k === 1 || k === 3) {
                // same op the reset-all loops use per player: restore the
                // default exposure, which re-includes the player / clears
                // the exposure mod (and live-updates the lists + counts)
                vm.resetMaxExp(p);
                return;
            }
            if (k === 2) {
                p.ProjLocked = 0;
                // clears wherever the active source keeps its numbers - a local
                // set, or the player's server mod when it is My Projections
                vm.writeProjToActiveSet(p, null);
                // slate refresh restores the original projection and rebuilds
                // the proj-adjusted list/count - same as the reset-all path
                vm.onSlateChanged();
            }
        };
        vm.adjRemoveAll = function () {
            switch (vm.adjManageKind) {
                case 0: vm.onUnlikeAllPlayers(); break;
                case 1: vm.onResetExcludesForSelSlate(); break;
                case 2: vm.onResetProjectionsForSelSlate(); break;
                case 3: vm.onResetExposuresForSelSlate(); break;
            }
        };
        // Opens the consolidated Filters & Sorting panel. The position
        // pills' active state is managed by jQuery class toggling, so a
        // freshly ng-if-rendered panel needs a state refresh after the
        // DOM exists.
        // Toggles the anchored Filters flyout. stopPropagation keeps the
        // trigger click from reaching documentClick (which closes it).
        vm.openFilterSortingDialog = function ($event) {
            vm.showFilterSortingDialog = vm.showFilterSortingDialog ? 0 : 1;
            if (vm.showFilterSortingDialog) {
                setTimeout(function () {
                    if (vm.refreshPositionFiltersState) { vm.refreshPositionFiltersState(); }
                }, 0);
            }
            if ($event) { $event.stopPropagation(); }
        };

        // keyboard activation for the role="button" view-switch segments
        $(document).on('keydown', '.viewSwitchBtn', function (e) {
            if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32) {
                e.preventDefault();
                $(this).trigger('click');
            }
        });

        // Escape closes the Filters flyout (anchored panel, no drag/resize)
        $(document).on('keydown', function (e) {
            if ((e.key === 'Escape' || e.keyCode === 27) && (vm.showFilterSortingDialog || (vm.thFilter && vm.thFilter.show))) {
                $scope.$apply(function () { vm.showFilterSortingDialog = 0; if (vm.thFilter) { vm.thFilter.show = false; } });
            }
        });

        // ---- floating windows (.fscWin: My Lineups, Stacks): drag by the
        // header + native resize; each window's rect persists by element id.
        // Mirrors the optimizer resizer; bails under 800px (full-bleed).
        function fscWinRectKey(el) { return 'fscWinRect_' + el.id; }

        function saveFscWinRect(el) {
            if (!el || window.innerWidth < 800) { return; }
            var r = el.getBoundingClientRect();
            var data = {};
            if (el.style.left) { data.l = Math.round(r.left); data.t = Math.round(r.top); }
            if (el.style.width) { data.w = Math.round(r.width); }
            if (el.style.height) { data.h = Math.round(r.height); }
            try { localStorage.setItem(fscWinRectKey(el), JSON.stringify(data)); } catch (e) { }
        }

        function applyFscWinRect(el) {
            if (!el || window.innerWidth < 800) { return; }
            var saved = null;
            try { saved = JSON.parse(localStorage.getItem(fscWinRectKey(el))); } catch (e) { }
            if (!saved) { return; }
            if (saved.w) { el.style.width = Math.min(saved.w, window.innerWidth - 20) + 'px'; }
            if (saved.h) { el.style.height = Math.min(saved.h, window.innerHeight - 20) + 'px'; }
            if (saved.l != null) {
                el.style.left = Math.max(4, Math.min(saved.l, window.innerWidth - 80)) + 'px';
                el.style.top = Math.max(4, Math.min(saved.t || 0, window.innerHeight - 60)) + 'px';
                el.style.right = 'auto';
                el.style.transform = 'none'; // drop the initial centering
            }
        }

        $(document).on('pointerdown', '.fscWin .luDlgDrag', function (e) {
            if (window.innerWidth < 800) { return; }
            // let the interactive header/bar controls work without dragging
            if ($(e.target).closest('.luDlgClose, select, input, button, .lineupSetBtn, .ctrlButton, .btnGrp, .ctrlDensitySeg').length) { return; }
            var el = $(e.target).closest('.fscWin')[0];
            if (!el) { return; }
            var oe = e.originalEvent || e;
            var rect = el.getBoundingClientRect();
            var sx = oe.clientX, sy = oe.clientY, sl = rect.left, st = rect.top;
            var move = function (ev) {
                el.style.transform = 'none';
                el.style.left = Math.max(4, Math.min(sl + ev.clientX - sx, window.innerWidth - 80)) + 'px';
                el.style.top = Math.max(4, Math.min(st + ev.clientY - sy, window.innerHeight - 48)) + 'px';
                el.style.right = 'auto';
            };
            var up = function () {
                document.removeEventListener('pointermove', move);
                document.removeEventListener('pointerup', up);
                saveFscWinRect(el);
            };
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', up);
            e.preventDefault();
        });

        // native resize handle gives no event; persist on release
        $(document).on('pointerup', '.fscWin', function (e) { saveFscWinRect(e.currentTarget); });

        // Escape closes whichever window is open
        $(document).on('keydown', function (e) {
            if (e.key === 'Escape' || e.keyCode === 27) {
                if (vm.showLineupsDialog || vm.showStacksDialog || vm.showLineupBuilder) {
                    $scope.$apply(function () {
                        vm.showLineupsDialog = 0;
                        vm.showStacksDialog = 0;
                        vm.showLineupBuilder = 0;
                    });
                }
            }
        });

        // (The optimizer is now a floating .fscWin dialog using the shared
        // drag/resize handlers; the old docked-panel left-edge resizer and
        // its --fsc-opt-w / table-reflow machinery were removed.)

        // ================= EXPANDED-ROW LAYOUT MANAGER =================
        // User-resizable + hideable columns in the expanded player row
        // (chart / alerts / matchup), plus per-card hiding inside the
        // matchup area. Widths are written as CSS variables on <html>,
        // so a drag on ONE row live-resizes EVERY open row; visibility
        // is body classes. Both persist in localStorage. Restore UI:
        // Settings dialog (Visuals tab) + the "+N hidden" pill in the
        // matchup row.
        var EXP_LAYOUT_KEY = 'fscExpRowLayout';
        var EXP_CARDS_KEY = 'fscHiddenMatchupCards';
        // generous per-column ceilings; EXP_COMBINED_MAX keeps the two
        // fixed columns from exceeding the row together (the matchup
        // column shrinks to a scrollable sliver at the extreme)
        var EXP_CLAMPS = { chart: { min: 15, max: 88 }, alerts: { min: 5, max: 60 } };
        var EXP_COMBINED_MAX = 92;

        vm.expLayout = { chart: 33, alerts: 9 };          // vw units
        vm.expHidden = { chart: false, alerts: false, matchup: false };
        vm.hiddenMatchupCards = [];
        // Page-wide display density. A single toolbar control switches between
        // 'normal', 'compact' and 'ultra'; the fscCompact / fscUltra body classes
        // (applied in applyExpLayout) + CSS tighten the dense areas accordingly.
        // Defaults (July 2026): compact on desktop, ULTRA on mobile (pairs
        // with the mobile cards default). A saved choice always wins.
        vm.densityMode = vm.isMobileDevice ? 'ultra' : 'compact';

        try {
            var expSt = JSON.parse(localStorage.getItem(EXP_LAYOUT_KEY) || 'null');
            if (expSt) {
                if (typeof expSt.chart === 'number') { vm.expLayout.chart = expSt.chart; }
                if (typeof expSt.alerts === 'number') { vm.expLayout.alerts = expSt.alerts; }
                if (expSt.hidden) {
                    vm.expHidden.chart = !!expSt.hidden.chart;
                    vm.expHidden.alerts = !!expSt.hidden.alerts;
                    vm.expHidden.matchup = !!expSt.hidden.matchup;
                }
            }
            vm.hiddenMatchupCards = JSON.parse(localStorage.getItem(EXP_CARDS_KEY) || '[]') || [];
            // saved choice wins; the legacy fscCompactMode='0' flag was an
            // explicit "not compact" pick, so it still maps to normal.
            // Per-view value first (projections is what boots), then the
            // legacy cross-view key, then the device default.
            vm.densityMode = localStorage.getItem('fscDensityMode_proj') ||
                localStorage.getItem('fscDensityMode') ||
                (localStorage.getItem('fscCompactMode') === '0' ? 'normal'
                    : (vm.isMobileDevice ? 'ultra' : 'compact'));
            vm.luDlgCompact = (vm.densityMode === 'compact' || vm.densityMode === 'ultra');
        } catch (e) { }

        function expClampVal(which, v) {
            var c = EXP_CLAMPS[which];
            var other = (which === 'chart') ? vm.expLayout.alerts : vm.expLayout.chart;
            var ceiling = Math.min(c.max, EXP_COMBINED_MAX - other);
            return Math.min(ceiling, Math.max(c.min, v));
        }

        function expSafeApply() {
            if (!$scope.$$phase) { $scope.$apply(); }
        }

        vm.applyExpLayout = function () {
            var root = document.documentElement;
            root.style.setProperty('--fsc-exp-chart', vm.expLayout.chart + 'vw');
            root.style.setProperty('--fsc-exp-alerts', vm.expLayout.alerts + 'vw');
            var b = $('body');
            b.toggleClass('fscExpHideChart', vm.expHidden.chart);
            b.toggleClass('fscExpHideAlerts', vm.expHidden.alerts);
            b.toggleClass('fscExpHideMatchup', vm.expHidden.matchup);
            b.toggleClass('fscCompact', vm.densityMode === 'compact' || vm.densityMode === 'ultra');
            b.toggleClass('fscUltra', vm.densityMode === 'ultra');
        };

        vm.saveExpLayout = function () {
            try {
                localStorage.setItem(EXP_LAYOUT_KEY, JSON.stringify({
                    chart: vm.expLayout.chart,
                    alerts: vm.expLayout.alerts,
                    hidden: {
                        chart: vm.expHidden.chart ? 1 : 0,
                        alerts: vm.expHidden.alerts ? 1 : 0,
                        matchup: vm.expHidden.matchup ? 1 : 0
                    }
                }));
            } catch (e) { }
        };

        vm.expAreaVisible = function (area) { return !vm.expHidden[area]; };

        vm.toggleExpArea = function (area) {
            vm.expHidden[area] = !vm.expHidden[area];
            vm.applyExpLayout();
            vm.saveExpLayout();
        };

        vm.resetExpLayout = function () {
            vm.expLayout = { chart: 33, alerts: 9 };
            vm.expHidden = { chart: false, alerts: false, matchup: false };
            vm.applyExpLayout();
            vm.saveExpLayout();
        };

        // ---- per-card hiding in the matchup area ----
        vm.isMatchupCardHidden = function (mid) {
            return vm.hiddenMatchupCards.indexOf(String(mid)) >= 0;
        };

        function saveHiddenCards() {
            try { localStorage.setItem(EXP_CARDS_KEY, JSON.stringify(vm.hiddenMatchupCards)); } catch (e) { }
        }

        vm.toggleMatchupCard = function (mid) {
            mid = String(mid);
            var i = vm.hiddenMatchupCards.indexOf(mid);
            if (i >= 0) { vm.hiddenMatchupCards.splice(i, 1); }
            else { vm.hiddenMatchupCards.push(mid); }
            saveHiddenCards();
            vm.refreshMatchupAreas();
        };

        // Page-wide display density: 'normal' | 'compact' | 'ultra' (toolbar
        // segmented control). Matchup cards + table rows restyle via the body
        // classes alone; the history chart computes its plot height from its
        // container at render time, so any already-open charts are re-fit.
        // card modes that render WITHOUT the mini chart: ultra everywhere,
        // and compact on mobile (matching CSS hides the .pcChart there) -
        // both the IO observer and the fetch-queue scan consult this so no
        // chart work happens for hidden hosts
        vm.cardsChartless = function () {
            return vm.densityMode == 'ultra' || (vm.isMobileDevice && vm.densityMode == 'compact');
        };

        vm.setDensityMode = function (mode) {
            if (mode !== 'compact' && mode !== 'ultra') { mode = 'normal'; }
            vm.densityMode = mode;
            vm.luDlgCompact = (mode === 'compact' || mode === 'ultra');   // the inline My Lineups view follows the page density
            var key = vm.viewPrefKey();
            try { localStorage.setItem('fscDensityMode_' + key, mode); } catch (e) { }
            try { localStorage.setItem('fscDensityMode', mode); } catch (e) { }   // legacy = cross-view default
            window.fscTrack('fsc_setting_change', { fsc_setting: 'density', fsc_value: mode });
            var b = $('body');
            b.toggleClass('fscCompact', mode === 'compact' || mode === 'ultra');
            b.toggleClass('fscUltra', mode === 'ultra');
            if (vm.refreshAllCharts) { vm.refreshAllCharts(); }
        };

        // Swap in the entering view's saved pair. Watching the key (rather
        // than hooking switchView) catches EVERY path in and out of the
        // inline views - the view buttons, the X, and Escape.
        vm.applyViewPrefs = function (key) {
            var card = loadCardModeFor(key);
            var dens = loadDensityFor(key);
            var densChanged = (dens !== vm.densityMode);
            vm.cardMode = card;
            vm.densityMode = dens;
            vm.luDlgCompact = (dens === 'compact' || dens === 'ultra');
            var b = $('body');
            b.toggleClass('fscCompact', dens === 'compact' || dens === 'ultra');
            b.toggleClass('fscUltra', dens === 'ultra');
            // only pay for a chart re-render when the density actually moved
            if (densChanged && vm.refreshAllCharts) { vm.refreshAllCharts(); }
            else if (vm.chart_debounce) { vm.chart_debounce(); }
        };
        $scope.$watch(function () { return vm.viewPrefKey(); }, function (nk, ok) {
            if (nk === ok) { return; }   /* initial call */
            vm.applyViewPrefs(nk);
        });

        // ultra-density card view: 2-3 char versions of the sport-specific
        // column labels so the info row fits on one line
        vm.shortColName = function (name) {
            switch (name) {
                case 'Order': return 'BO';
                case 'Bat/Arm': return 'B/A';
                default: return name;
            }
        };

        vm.restoreAllMatchupCards = function () {
            vm.hiddenMatchupCards = [];
            saveHiddenCards();
            vm.refreshMatchupAreas();
        };

        // re-render the matchup area of every open expanded row
        vm.refreshMatchupAreas = function () {
            $('.playerExtraRow').each(function () {
                var ele = $(this);
                var sid = parseInt(ele.attr('data-salaryid'));
                var ps = (vm.SalaryDict) ? vm.SalaryDict[sid] : null;
                if (ps) { vm.populateMacthupDataHtml(ps, ele.find('.playerMatchupArea')); }
            });
        };

        vm.applyExpLayout();

        // ---- drag-resize (delegated; live-updates root css variables) ----
        var expDrag = null;
        $(document).on('pointerdown', '.expResizer', function (e) {
            var which = $(this).hasClass('expResizerChart') ? 'chart' : 'alerts';
            var oe = e.originalEvent || e;
            expDrag = { which: which, startX: oe.clientX, startVal: vm.expLayout[which] };
            $('body').addClass('fscExpResizing');
            e.preventDefault();
        });
        $(document).on('pointermove', function (e) {
            if (!expDrag) { return; }
            var oe = e.originalEvent || e;
            var dvw = (oe.clientX - expDrag.startX) / window.innerWidth * 100;
            var v = expClampVal(expDrag.which, expDrag.startVal + dvw);
            vm.expLayout[expDrag.which] = Math.round(v * 10) / 10;
            document.documentElement.style.setProperty(
                '--fsc-exp-' + expDrag.which, vm.expLayout[expDrag.which] + 'vw');
        });
        $(document).on('pointerup pointercancel', function () {
            if (!expDrag) { return; }
            expDrag = null;
            $('body').removeClass('fscExpResizing');
            vm.saveExpLayout();
        });

        // ---- hide / restore affordances (delegated so they survive
        // the populate functions re-rendering the areas) ----
        $(document).on('click', '.expAreaHide, .expAreaRestore', function (e) {
            e.preventDefault();
            e.stopPropagation();
            vm.toggleExpArea($(this).attr('data-area'));
            expSafeApply();
        });
        // keyboard activation for the role=button affordances
        $(document).on('keydown', '.expAreaHide, .expAreaRestore, .matchupHiddenPill, .matchupHiddenChip', function (e) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                $(this).trigger('click');
            }
        });
        $(document).on('click', '.matchupCardHide', function (e) {
            e.preventDefault();
            e.stopPropagation();
            vm.toggleMatchupCard($(this).attr('data-mid'));
            expSafeApply();
        });
        $(document).on('click', '.matchupHiddenPill', function (e) {
            e.preventDefault();
            e.stopPropagation();
            vm.restoreAllMatchupCards();
            expSafeApply();
        });
        // EXPERIMENTAL (revertable): restore a single hidden card from its chip.
        $(document).on('click', '.matchupHiddenChip', function (e) {
            e.preventDefault();
            e.stopPropagation();
            vm.toggleMatchupCard($(this).attr('data-mid'));
            expSafeApply();
        });
        // ============== /EXPANDED-ROW LAYOUT MANAGER ==============

        vm.onPopupSettingToggled = function(str){
            var newVal = !vm[str];
            vm[str] = newVal;
            LineStarUtility.saveSettingInt(str, newVal ? 1 : 0);
		};

        vm.onHideZeroProjToggled = function(){
            if(vm.hideZeroProj == 1){
                vm.hideZeroProj = 0;     
			}else{
                vm.hideZeroProj = 1;     
			}
            LineStarUtility.saveSettingInt('hideZeroProj2', vm.hideZeroProj);
            vm.filter_debounce();
		};
        vm.onShowExcludeCtrlToggled = function () {
            if (vm.showExcludeCtrl) {
                vm.showExcludeCtrl = false;
            } else {
                vm.showExcludeCtrl = true;
            }
            LineStarUtility.saveSettingInt('showExcludeCtrlV2', vm.showExcludeCtrl ? 1 : 0);
            vm.filter_debounce();
        };
        vm.onToggleRabAlwaysVisible = function () {
            vm.rabAlwaysVisible = !vm.rabAlwaysVisible;
            LineStarUtility.saveSettingInt('rabAlwaysVisible', vm.rabAlwaysVisible ? 1 : 0);
        };
        vm.onToggleZeroProjLast = function () {
            vm.zeroProjLast = !vm.zeroProjLast;
            LineStarUtility.saveSettingInt('zeroProjLast', vm.zeroProjLast ? 1 : 0);
            vm.filter_debounceShort();   // re-sort with the new rule
        };

        vm.getShouldShowStackFinder = function () {
            var val = false;
            switch (LineStar.Sport) {
                case 1: case 2: case 3: case 4: case 6: case 10: case 11: case 12: case 13: case 14: val = true; break;
            }
            return val;
        };
        vm.shouldShowStackFinder = vm.getShouldShowStackFinder();

        vm.getSportHasHeadshots = function () {
            var val = false;
            switch (LineStar.Sport) {
                case 1: case 2: case 3: case 5: case 6: val = true; break;
            }
            return false;
        };
        vm.sportHasHeadshots = vm.getSportHasHeadshots();

        vm.getSportHasTeamImages = function () {
            var val = false;
            switch (LineStar.Sport) {
                case 1: case 2: case 3: case 4: case 6: case 10: case 11: case 12: val = true; break;
            }
            return val;
        };
        vm.sportHasTeamImages = vm.getSportHasTeamImages();

        vm.findGame = function(gameId){
            return vm.gameDictForSlate[gameId];
		};

        vm.getImpliedColor = function(pts, reverse) {
            var m = 0;

            switch (LineStar.Sport) {
                case 12:
                    m = pts >= 88 ? 1 : pts >= 80 ? 0 : -1;
                    break;
                case 2:
                    m = pts >= 107 ? 1 : pts >= 103 ? 0 : -1;
                    break;
                case 1:
                    m = pts >= 22 ? 1 : pts >= 19 ? 0 : -1;
                    break;
                case 3:
                    m = pts >= 4.7 ? 1 : pts >= 4.1 ? 0 : -1;
                    break;
                case 6:
                    m = pts >= 3 ? 1 : pts >= 2.5 ? 0 : -1;
                    break;
            }

            return (m == 0) ? 'vegasNeutral' : (m == 1 && reverse == 0 || m == -1 && reverse == 1) ? 'vegasGood' : 'vegasBad';
        };

        vm.onResetExcludesForSelSlate = function () {
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a premium LineStar member to do this.');
                return;
            }
            var salDictForSlate = vm.salariesPerSlate[vm.selectedSlate.Id];
            var mods = vm.periodData.Mods;
            for (var i = 0; i < mods.length; i++) {
                if (mods[i].Loved == 2) {
                    var sal = salDictForSlate[mods[i].PlayerSalaryId];
                    if (sal != null && sal != undefined) {
                        vm.setMaxExp(sal, 0, 1);
                    }
                }
            }
            vm.onSlateChanged();
            vm.showtoast('Your excluded players have been cleared.');
        };
        vm.onResetLikesForSelSlate = function () {
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a premium LineStar member to do this.');
                return;
            }
            var salDictForSlate = vm.salariesPerSlate[vm.selectedSlate.Id];
            var mods = vm.periodData.Mods;
            for (var i = 0; i < mods.length; i++) {
                if (mods[i].Loved == 1) {
                    var sal = salDictForSlate[mods[i].PlayerSalaryId];
                    if (sal != null && sal != undefined) {
                        sal.IsLiked = false;
                        mods[i].Loved = 0;
                        vm.pushUserModToSave(mods[i]);
                    }
                }
            }
            vm.onSlateChanged();
            vm.showtoast('Your liked players have been cleared.');
        };
        vm.onResetProjectionsForSelSlate = function () {
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a premium LineStar member to do this.');
                return;
            }
            // The mod loop that used to live here cleared server-side ProjLock;
            // projections are local now, so this clears the active set for the
            // slate on screen instead. Love/hate and max exposure are untouched.
            vm.clearActiveSetForSlate();
            vm.onSlateChanged();
            vm.showtoast('Your projection adjustments for this slate have been cleared.');
        };
        vm.onResetExposuresForSelSlate = function () {
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a premium LineStar member to do this.');
                return;
            }
            var salDictForSlate = vm.salariesPerSlate[vm.selectedSlate.Id];
            var mods = vm.periodData.Mods;
            for (var i = 0; i < mods.length; i++) {
                var m = mods[i];
                if ((m.Flags & 4) == 4) {
                    var sal = salDictForSlate[m.PlayerSalaryId];
                    if (sal != null && sal != undefined) {
                        vm.setMaxExp(sal, 0, 1);
                    }
                }
            }
            vm.onSlateChanged();
            vm.showtoast('Your Ownership adjustments for this slate have been cleared.');
        };

        vm.onResetProjections = function(){
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a premium LineStar member to do this.');
                return;
            }
            // On the synced source "all" is every projection the account holds
            // for this period, which is the scope this button had before
            // projections could live locally. The source itself is permanent, so
            // unlike a set it is emptied rather than deleted and stays selected.
            if (vm.isMineProjSource(vm.projSource)) {
                vm.clearMineAll();
                vm.onSlateChanged();
                vm.showtoast('Your saved projections have been cleared.');
                return;
			}

            // "all" now means every slate this set covers - the whole point of a
            // set is that it spans them, so clearing one slate at a time would
            // not match the button.
            if (vm.projSource !== 'linestar') {
                var s = vm.findProjSet(vm.projSource);
                if (s != null) {
                    var i = vm.projSets.indexOf(s);
                    if (i >= 0) { vm.projSets.splice(i, 1); }
                    try { localStorage.removeItem(vm.projSetKey(s.id)); } catch (e) { }
                    vm.saveProjSetIndex();
                }
                vm.setProjSource('linestar');
            }
            vm.onSlateChanged();
            vm.showtoast('Your projection adjustments have been cleared.');
		};
        vm.onResetLikesExc = function(){
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a premium LineStar member to do this.');
                return;
            }
            var mods = vm.periodData.Mods;
            var salDictForSlate = vm.salariesPerSlate[vm.selectedSlate.Id];
            for(var i=0;i<mods.length; i++){
                if (mods[i].Loved != 0) {

                    var sal = salDictForSlate[mods[i].PlayerSalaryId];
                    if (sal != null && sal != undefined) {
                        sal.IsLiked = false;
                        sal.IsIncluded = true;
                    }

                    mods[i].Loved = 0;
                    vm.pushUserModToSave(mods[i]);
				}
			}
            vm.onSlateChanged();
            vm.showtoast('Your likes and fades have been cleared.');
		};
        vm.onExportProjections = function(){
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a premium LineStar member to do this.');
                return;
            }
            vm.onCreateProjectionExport();
        };
        vm.onCreateProjectionExport = function () {
            var data = 'LineStarId,Name,Position,Team,Salary,Projected,Scored,IsOverridden,OppRank,OppRankTotal,Ceiling,Floor,StartingStatus,Consistency,ProjOwn,Consensus,Leverage,Safety,AlertScore,SIC,PPG,VersusStr,DFS_ID';
            var eles = ['Id', 'Name', 'POS', 'PTEAM', 'SAL', 'PP', 'PS', 'ProjLocked', 'OppRank', 'OppTotal', 'Ceil', 'Floor', 'STAT', 'Conf', 'Owned', 'AggProj', 'Leverage', 'Safety', 'AlertScore', 'SIC', 'PPG', 'VersusStr', 'DSPID'];

            if (vm.periodData.HasTeams) {
                data += ',Vegas,VegasML,VegasTotals,VegasImplied';
                eles.push(...['vegasL', 'vegasML', 'vegasTotals', 'VegasImplied']);
            }

            if (vm.showDepth) {
                data += ",Depth";
                eles.push('depthOrder');
            }

            if (vm.Sport == 6) {
                eles.push('LU');
                eles.push('PPL');
                data += ',Line,PowerPlayLine';
            } else if (vm.Sport == 3) {
                eles.push('LU');
                eles.push('BatThrow');
                data += ',BatOrder,BatThrow';
            }
            data += '\r\n';

            for (var i = 0; i < vm.salaryListForSelSlateALL.length; i++) {
                var s = vm.salaryListForSelSlateALL[i];
                var g = s.Game;
                if (g != null && g != undefined) {
                    s.vegasML = (g.AwayTeamId == s.PTID) ? g.VegasMoneyLineAway : g.VegasMoneyLineHome;
                    s.vegasL = (g.AwayTeamId == s.PTID) ? g.VegasLineAway : g.VegasLineHome;
                }

                for (var j = 0; j < eles.length; j++) {
                    data = vm.ae(data, s[eles[j]]);
                }
                data += '\r\n';
            }

            var csvData = new Blob(["\uFEFF"+data], { type: 'text/csv;charset=utf-8;' });
            var csvUrl = URL.createObjectURL(csvData);
            var he = document.createElement('a');
            he.href = csvUrl;
            he.target = '_blank';
            he.download = "LineStar_" + LineStar.SportName + "_" + vm.selectedSlate.SlateName + '_' + vm.selectedSlate.Id + '.csv';
            he.click();
        };

        vm.ae = function (str1, str2) {
            if (str2 == undefined) {
                str2 = '';
            }
            if (typeof str2 === 'string' || str2 instanceof String) {
                str2 = str2.replace(',', ':');
            }
            return str1 + str2 + ",";
        }
        vm.initUploadFileInfo = function () {
            vm.uploadedFileInfo = {
                'lineStarColIdx': -1, 'nameColIdx': -1, 'projColIdx': -1, 'lineStarColName': '', 'nameColName': '', 'projColName': '', 'fileSet': false, 'namesMapped': 0, 'namesGuessed': 0, 'namesNeedMatch': 0, 'totalRows': 0, 'showCols': false, 'showPlayerMap': false, 'saved': false, 'delim': ','
            };

            // Order here is the order the mapping UI lists them in. Team and
            // LineStar ID are optional but pull real weight: the id makes our
            // own export round-trip exactly, and the team is the only tiebreaker
            // the name matcher has when two players share a surname.
            vm.uploadedFileInfo.mapCols = {};
            vm.uploadedFileInfo.mapCols['name'] = { 'Name': "Player name", "Opt": false, 'cols': [], 'index': -1, 'selectedName': '', 'showCols': false };
            vm.uploadedFileInfo.mapCols['proj'] = { 'Name': "Projection", "Opt": false, 'cols': [], 'index': -1, 'selectedName': '', 'showCols': false };
            vm.uploadedFileInfo.mapCols['team'] = { 'Name': "Team (optional)", "Opt": true, 'cols': [], 'index': -1, 'selectedName': '', 'showCols': false };
            vm.uploadedFileInfo.mapCols['linestarid'] = { 'Name': "LineStar ID (optional)", "Opt": true, 'cols': [], 'index': -1, 'selectedName': '', 'showCols': false };
        };
        vm.initUploadFileInfo();

        vm.onPasteProjections = function () {
            navigator.clipboard
                .readText()
                .then(
                    cliptext =>(vm.processProjectionsTextData(cliptext)));
        };

        vm.onPlayerMapChanged = function (txtbox) {
            var mi = [];
            var txt = vm.uploadedFileInfo.playerToMapSearch.toLowerCase();
            for (var i = 0; i < vm.salaryListForSelSlateALL.length; i++) {
                var itm = vm.salaryListForSelSlateALL[i];
                var name = itm.Name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (name.indexOf(txt) >= 0) {
                    mi.push(itm);
                }
            }
            vm.uploadedFileInfo.possibleMatches = mi;
        };
        vm.onNameMapped = function (player) {
            var p = vm.uploadedFileInfo.playerToMap;
            if (p == null || player == null) { return; }

            // a row being re-pointed has to release the name it held first
            if (p.ManualMapped && p.Sal != null && String(p.Sal.PID) !== String(player.PID)) {
                vm.forgetProjAlias(p.Name);
			}

            p.Sal = player;
            p.Valid = p.ValidNum;
            p.Start = player.UserPP;
            p.Included = p.Valid;
            p.ManualMapped = true;
            p.MatchHow = 'manual';

            // remembered for next week's file - doing this by hand once and
            // being asked again is the whole reason the alias map exists
            vm.rememberProjAlias(p.Name, player);
            vm.recountProjMatches();
            // the row drops out of the needs-work block, so the next one to deal
            // with is waiting at the top when the pane comes back
            vm.sortUploadedProjItems();

            vm.uploadedFileInfo.showPlayerMap = false;
		};

        vm.clearPlayerMap = function (pi) {
            if (pi == null) { return; }
            vm.forgetProjAlias(pi.Name);
            pi.ManualMapped = false;
            pi.MatchHow = null;
            pi.Sal = null;
            pi.Start = 0;
            pi.Included = false;
            vm.recountProjMatches();
            vm.sortUploadedProjItems();   // back into the needs-work block
		};

        vm.recountProjMatches = function () {
            var m = 0, g = 0, need = 0;
            for (var i = 0; i < (vm.uploadedProjItems || []).length; i++) {
                var it = vm.uploadedProjItems[i];
                if (it.Sal == null) {
                    // same rule as projImportTier, so the count and the block it
                    // points at are always the same rows
                    if (it.ValidNum && !it.Blank) { need++; }
                    continue;
				}
                m++;
                if (it.MatchHow === 'fuzzy') { g++; }
			}
            vm.uploadedFileInfo.namesMapped = m;
            vm.uploadedFileInfo.namesGuessed = g;
            vm.uploadedFileInfo.namesNeedMatch = need;
		};

        // What the row shows beside the file's own name. Silent when the two
        // names agree, because then there is nothing for the user to check;
        // anything else - a guess, a remembered match, an id hit under a
        // different spelling - gets named so a wrong one is visible.
        vm.projMatchNote = function (pi) {
            if (pi == null || pi.Sal == null) { return ''; }
            if (vm.keyProjName(pi.Name) === vm.keyProjName(pi.Sal.Name)) { return ''; }
            return pi.Sal.Name;
		};

        vm.onShowColSelector = function (col) {
            col.showCols = true;
		};

        vm.showMapPlayerView = function (pi) {
            vm.uploadedFileInfo.showPlayerMap = true;
            vm.uploadedFileInfo.playerToMap = pi;
            vm.uploadedFileInfo.playerToMapSearch = '';
            vm.uploadedFileInfo.possibleMatches = vm.rankProjCandidates(pi);
		};

        // Opening on an alphabetical list of four hundred players and asking
        // someone to find the one we could not is the lazy version of this.
        // Surname first, then a shared token, then the same team - the right
        // answer is usually already the first row, before anything is typed.
        vm.rankProjCandidates = function (pi) {
            var sals = vm.salaryListForSelSlateALL || [];
            var norm = vm.normProjName(pi != null ? pi.Name : '');
            var toks = norm.length ? norm.split(' ') : [];
            var last = (toks.length > 1) ? toks[toks.length - 1] : norm;
            var team = vm.normProjTeam(pi != null ? pi.Team : '');

            var scored = [];
            for (var i = 0; i < sals.length; i++) {
                var s = sals[i];
                var n = vm.normProjName(s.Name);
                var p = n.split(' ');
                var sc = 0;

                if (last.length && p.length > 1 && p[p.length - 1] === last) { sc += 100; }
                for (var j = 0; j < toks.length; j++) {
                    if (toks[j].length > 2 && n.indexOf(toks[j]) >= 0) { sc += 25; }
				}
                if (team.length && vm.normProjTeam(s.PTEAM) === team) { sc += 40; }

                scored.push({ s: s, k: sc, n: String(s.Name) });
			}

            scored.sort(function (a, b) {
                if (b.k !== a.k) { return b.k - a.k; }
                return a.n.localeCompare(b.n);
			});

            var out = [];
            for (var x = 0; x < scored.length; x++) { out.push(scored[x].s); }
            return out;
		};
        vm.onProjColSelector = function (val, col) {
            if (!col.selected) {
                return;
            }
            val.showCols = false;
            val.index = col.index;
            val.selectedName = col.Name;
            for (var i = 0; i < val.cols.length; i++) {
                if (col.index != val.cols[i].index) {
                    val.cols[i].selected = false;
                }
            }

            vm.processUploadedProjFile();
        };

        // One read path for both ways in - the picker and the drop zone.
        vm.projFileName = '';

        vm.readProjFile = function (file) {
            if (file == null) { return; }
            vm.projFileName = file.name || '';

            var reader = new FileReader();
            reader.onload = function () { vm.processProjectionsTextData(reader.result); };
            reader.onerror = function () {
                $scope.$applyAsync(function () {
                    vm.projFileName = '';
                    vm.showtoast('That file could not be read.');
				});
			};
            reader.readAsText(file);
		};

        vm.onOpenProjFile = function (event, files) {
            var input = (event != null) ? event.target : null;
            var list = files || (input ? input.files : null);
            if (list == null || !list.length) { return; }

            vm.readProjFile(list[0]);

            // A file input fires no change event when the same file is picked
            // twice, so re-choosing the one you just fixed in Excel does nothing
            // until the value is cleared. The read above already has the File.
            if (input) { try { input.value = ''; } catch (e) { } }
		};

        vm.onDropProjFile = function (file) {
            // A spreadsheet dropped on a CSV importer should be told so. Parsing
            // it anyway produces one unusable column and a screen of unmatched
            // rows, which reads as our bug rather than the wrong file.
            var name = String((file && file.name) || '').toLowerCase();
            if (name.length && !/\.(csv|tsv|txt)$/.test(name)) {
                vm.showtoast('Drop a CSV, TSV or text file — ' + file.name + ' is not one we can read.');
                return;
			}
            vm.readProjFile(file);
		};

        vm.processProjectionsTextData = function (text) {
            $scope.$apply(() => {
                vm.initUploadFileInfo();
                vm.uploadedFileInfo.lines = String(text == null ? '' : text).split(/\r?\n/);
                vm.uploadedFileInfo.saved = false;

                // a BOM on the first header would otherwise make column one
                // match nothing - our own export writes one
                if (vm.uploadedFileInfo.lines.length) {
                    vm.uploadedFileInfo.lines[0] = vm.uploadedFileInfo.lines[0].replace(/^\uFEFF/, '');
				}

                var header = vm.uploadedFileInfo.lines[0] || '';
                vm.uploadedFileInfo.delim = vm.sniffProjDelim(header);

                var cols = vm.parseCsvRow(header, vm.uploadedFileInfo.delim);
                vm.uploadedFileInfo.fileSet = true;

                for (var key in vm.uploadedFileInfo.mapCols) {
                    var mapCol = vm.uploadedFileInfo.mapCols[key];
                    mapCol.cols = [];
                    mapCol.index = -1;
                    mapCol.selectedName = '';

                    // best score across the whole header, not the last hit
                    var bestIdx = -1, bestScore = 0;
                    for (var i = 0; i < cols.length; i++) {
                        var sc = vm.scoreProjCol(key, cols[i]);
                        if (sc > bestScore) { bestScore = sc; bestIdx = i; }
					}

                    for (var j = 0; j < cols.length; j++) {
                        mapCol.cols.push({ 'Name': cols[j], 'index': j, 'selected': (j === bestIdx) });
					}

                    if (bestIdx >= 0) {
                        mapCol.index = bestIdx;
                        mapCol.selectedName = cols[bestIdx];
					}

                    mapCol.cols.splice(0, 0, { 'Name': 'NONE', 'index': -1, 'selected': (bestIdx < 0) });
				}

                vm.processUploadedProjFile();
			});
		};

        // Writes the imported numbers into a NAMED local set in one pass rather
        // than one server mod per player. The name is supplied by the dialog;
        // re-uploading under an existing name replaces that set's numbers for
        // this slate, which is how a user refreshes a projection source.
        vm.uploadProjections = function (setName, replaceSetId) {
            if (vm.selectedSlate == null) { return; }

            // importing into the synced source is a different job entirely -
            // hundreds of server mods rather than one localStorage write
            if (vm.isMineProjSource(replaceSetId)) { vm.uploadProjectionsToMine(); return; }

            var proj = {}, n = 0;
            for (var i = 0; i < vm.uploadedProjItems.length; i++) {
                var item = vm.uploadedProjItems[i];
                if (!item.Valid || !item.Included || item.Sal == null) { continue; }
                proj[item.Sal.Id] = item.Proj;
                n++;
			}
            if (!n) { vm.showtoast('No projections were mapped to players on this slate.'); return; }

            var now = new Date().getTime();
            var id = replaceSetId || null;

            // an existing set keeps its id, so every other slate it covers and
            // the user's source selection both survive the re-upload
            if (id != null && vm.findProjSet(id) == null) { id = null; }
            if (id == null) {
                id = vm.newProjSetId();
                vm.projSets.unshift({
                    id: id, name: setName || 'Imported projections',
                    created: now, updated: now, slates: []
				});
                while (vm.projSets.length > PROJ_SET_MAX) {
                    var drop = vm.projSets.pop();
                    try { localStorage.removeItem(vm.projSetKey(drop.id)); } catch (e) { }
				}
			} else if (setName) {
                vm.findProjSet(id).name = setName;
			}

            var body = vm.readProjSetBody(id);
            body[vm.selectedSlate.Id] = { periodId: LineStar.PeriodId, updated: now, proj: proj };
            if (!vm.writeProjSetBody(id, body)) { return; }

            vm.touchProjSetSlate(id, vm.selectedSlate.Id, n, now);
            vm.uploadedFileInfo.saved = true;

            vm.setProjSource(id);   // land on what was just imported
            vm.showtoast(n + ' projection' + (n === 1 ? '' : 's') + ' saved to "' + vm.projSourceName() + '".');
		};

        // ---- reading the file ----
        // split(',') loses to any file that quotes a name containing a comma:
        // "Hockenson, T.J." shifts every column after it by one and the whole
        // row lands as garbage. Quotes are consumed here, so nothing downstream
        // has to strip them back off.
        vm.parseCsvRow = function (line, delim) {
            delim = delim || ',';
            var out = [], cur = '', inQ = false;

            for (var i = 0; i < line.length; i++) {
                var ch = line.charAt(i);
                if (inQ) {
                    if (ch !== '"') { cur += ch; }
                    else if (line.charAt(i + 1) === '"') { cur += '"'; i++; }   // "" is a literal quote
                    else { inQ = false; }
				}
                else if (ch === '"') { inQ = true; }
                else if (ch === delim) { out.push(cur); cur = ''; }
                else { cur += ch; }
			}
            out.push(cur);
            return out;
		};

        // Pasted data is very often tab separated - it came out of a spreadsheet
        var TAB = String.fromCharCode(9);
        vm.sniffProjDelim = function (headerLine) {
            var c = 0, t = 0;
            for (var i = 0; i < headerLine.length; i++) {
                var ch = headerLine.charAt(i);
                if (ch === ',') { c++; } else if (ch === TAB) { t++; }
			}
            return (t > c) ? TAB : ',';
		};

        // ---- guessing the columns ----
        // By score rather than by first hit: a file carrying both "Projected"
        // and "ProjOwn", or both "Player" and "PlayerID", used to end up with
        // whichever happened to sit further right in the header.
        var PROJ_COL_HINTS = {
            name: [['name', 100], ['player', 98], ['playername', 98], ['player name', 98], ['fullname', 92], ['full name', 92]],
            proj: [['proj', 100], ['projection', 100], ['projected', 100], ['fpts', 98], ['fpp', 92],
                   ['projpts', 96], ['proj pts', 96], ['projected points', 96], ['myproj', 94],
                   ['fantasypoints', 90], ['fantasy points', 90], ['points', 72]],
            team: [['team', 100], ['teamabbrev', 96], ['team abbrev', 96], ['teamabbreviation', 96], ['tm', 90]],
            linestarid: [['linestarid', 100], ['linestar id', 100]]
		};

        // Headers that contain a hint but mean something else entirely. Without
        // these, "ProjOwn" scores as a projection and "Position" as a name.
        var PROJ_COL_BLOCK = {
            name: { playerid: 1, nameid: 1, id: 1, position: 1, pos: 1, teamid: 1, lastname: 1, firstname: 1 },
            proj: { projown: 1, 'proj own': 1, projectedownership: 1, 'projected ownership': 1, ownership: 1, own: 1, projminutes: 1 },
            team: { teamid: 1, opponent: 1, opp: 1, oppteam: 1 },
            linestarid: {}
		};

        vm.scoreProjCol = function (key, header) {
            var h = String(header == null ? '' : header).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
            if (!h) { return 0; }
            if ((PROJ_COL_BLOCK[key] || {})[h]) { return 0; }

            var hints = PROJ_COL_HINTS[key] || [];
            var best = 0;
            for (var i = 0; i < hints.length; i++) {
                if (h === hints[i][0]) { return hints[i][1]; }              // an exact header wins outright
                if (h.indexOf(hints[i][0]) >= 0) { best = Math.max(best, hints[i][1] - 45); }
			}
            return best;
		};

        // The same import, aimed at the server instead of at localStorage. Every
        // mapped row becomes a mod; they go up in batches and the toast reports
        // what actually landed, because a partial failure here is a real
        // possibility with several hundred of them.
        vm.uploadProjectionsToMine = function () {
            var mods = [], n = 0;

            for (var i = 0; i < vm.uploadedProjItems.length; i++) {
                var item = vm.uploadedProjItems[i];
                if (!item.Valid || !item.Included || item.Sal == null) { continue; }

                var mod = vm.findOrCreateUserMod(item.Sal);
                if (mod == null) { continue; }
                mod.ProjLock = item.Proj;
                mod.Flags = mod.Flags | MOD_FLAG_PROJ;
                mods.push(mod);
                n++;
			}

            if (!n) { vm.showtoast('No projections were mapped to players on this slate.'); return; }

            // applied locally straight away - the save is in flight behind it,
            // and making the user wait on the network to see their own numbers
            // would be worse than reconciling a failure afterwards
            vm.rebuildMineProjMap();
            vm.uploadedFileInfo.saved = true;
            vm.setProjSource(PROJ_MINE);
            vm.showtoast('Saving ' + n + ' projection' + (n === 1 ? '' : 's') + ' to your account…');

            vm.saveModsChunked(mods, function (sent, failed) {
                $scope.$applyAsync(function () {
                    if (failed) {
                        vm.showtoast(sent + ' saved, ' + failed + ' could not be saved. Import again to retry the rest.');
					} else {
                        vm.showtoast(sent + ' projection' + (sent === 1 ? '' : 's') + ' saved and synced to your account.');
					}
				});
			});
		};

        vm.processUploadedProjFile = function () {

            vm.uploadedProjItems = [];

            var projColIdx = vm.uploadedFileInfo.mapCols['proj'].index;
            var nameColIdx = vm.uploadedFileInfo.mapCols['name'].index;
            var teamColIdx = vm.uploadedFileInfo.mapCols['team'].index;
            var lineStarColIdx = vm.uploadedFileInfo.mapCols['linestarid'].index;
            var delim = vm.uploadedFileInfo.delim || ',';

            vm.uploadedFileInfo.namesMapped = 0;
            vm.uploadedFileInfo.namesGuessed = 0;
            vm.uploadedFileInfo.namesNeedMatch = 0;
            vm.uploadedFileInfo.validProjections = 0;
            vm.uploadedFileInfo.totalRows = 0;

            // nothing to do without a number, and without either way to say who.
            // Counters are zeroed above this, so a re-map that drops a required
            // column cannot leave the last file's numbers on screen.
            if (projColIdx < 0 || (lineStarColIdx < 0 && nameColIdx < 0)) { return; }

            vm.buildProjNameIndex();

            for (var i = 1; i < vm.uploadedFileInfo.lines.length; i++) {
                var items = vm.parseCsvRow(vm.uploadedFileInfo.lines[i], delim);
                if (items == null || items.length <= 1) { continue; }

                var name = String(nameColIdx >= 0 ? (items[nameColIdx] || '') : '').trim();
                var lsid = (lineStarColIdx >= 0) ? String(items[lineStarColIdx] || '').trim() : '';
                if (!name.length && !lsid.length) { continue; }      // trailing blank rows

                var raw = String(items[projColIdx] == null ? '' : items[projColIdx]).trim();

                // An empty cell is a projection of zero, not a broken row. Feeds
                // write "no number this week" several ways and they all mean the
                // same thing, so they all land on 0 rather than filling the list
                // with ERROR for rows that are perfectly importable.
                var blank = (raw.length === 0) || /^(-+|[\u2013\u2014]|n\/?a|null|dnp|inactive)$/i.test(raw);
                var num = blank ? 0 : parseFloat(raw);
                var validNum = false;

                if (isNaN(num)) {
                    // Actual text here is still an error, deliberately: it almost
                    // always means the wrong column is mapped, and quietly turning
                    // a whole file of names into zeroes would be far worse than
                    // showing the user why nothing looks right.
                    num = "ERROR";
				} else {
                    num = LineStarUtility.round(num, 2);
                    validNum = true;
                    vm.uploadedFileInfo.validProjections++;
				}

                var item = {
                    'Name': name,
                    'Team': String(teamColIdx >= 0 ? (items[teamColIdx] || '') : '').trim(),
                    'Proj': num, 'Included': false, 'Id': i, 'Start': 0, 'ManualMapped': false,
                    'Blank': blank
				};

                var hit = vm.matchProjRow(name, item.Team, lsid, false);
                item.Sal = (hit != null) ? hit.sal : null;
                item.MatchHow = (hit != null) ? hit.how : null;
                item.Valid = (item.Sal != null && validNum);
                item.ValidNum = validNum;

                if (item.Sal != null) {
                    vm.uploadedFileInfo.namesMapped++;
                    if (item.MatchHow === 'fuzzy') { vm.uploadedFileInfo.namesGuessed++; }
                    item.Included = item.Valid;
                    item.Start = item.Sal.UserPP;

                    // both sides zero means the player is not really in this
                    // file - do not spend a saved projection on them
                    if (num == 0 && item.Sal.PP == 0) { item.Included = false; }
				} else {
                    item.Start = item.Proj;
				}

                vm.uploadedFileInfo.totalRows++;
                vm.uploadedProjItems.push(item);
			}

            vm.recountProjMatches();
            vm.sortUploadedProjItems();
		};

        // Which rows want a human, most first.
        //
        //   0  no match, but a real number in the file - actual work, and
        //      finding these by scrolling six hundred rows is the difference
        //      between the importer being usable and not
        //   1  matched on a partial name - a claim to check rather than work
        //   2  matched outright - nothing to do
        //   3  the junk drawer: no match AND no usable number, which is what a
        //      footer row or a stray blank line parses to. Nothing can be done
        //      with these, so they sink below the finished rows.
        vm.projImportTier = function (it) {
            // A blank cell now parses to a valid 0, but it still carries no
            // number worth chasing - an unmatched blank row belongs in the junk
            // drawer with the footer rows, not at the top of the work queue.
            if (it.Sal == null) { return (it.ValidNum && !it.Blank) ? 0 : 3; }
            return (it.MatchHow === 'fuzzy') ? 1 : 2;
		};

        vm.sortUploadedProjItems = function () {
            vm.uploadedProjItems.sort(function (a, b) {
                var d = vm.projImportTier(a) - vm.projImportTier(b);
                // Id is the row's own line number, so ties hold file order
                // without depending on the engine's sort being stable
                return (d !== 0) ? d : (a.Id - b.Id);
			});
		};

        // ══ Name matching for imported projections ═════════════════════════════
        // A projection file names players however its author felt like: "T.J.
        // Hockenson", "TJ Hockenson", "Hockenson, T.J.", "Ronald Acuna Jr.",
        // "Acuña". Exact string equality - all this used to do - misses every
        // one of those and dumps the row on the user to match by hand, on every
        // single import.
        //
        // So: normalize hard, index the slate under several forms, and walk a
        // ladder from certain down to merely likely. Anything below an outright
        // hit is labelled in the UI, so a bad guess is caught by eye before it
        // is saved rather than after.

        // Noise for matching, common in both feeds. Bare "V" is deliberately
        // absent - too plausible as a real token to strip blind.
        var NAME_SUFFIXES = { jr: 1, sr: 1, ii: 1, iii: 1, iv: 1 };

        // "T.J. Hockenson (Q)" -> "tj hockenson". Punctuation goes entirely: it
        // is the single largest source of near-misses, and no two players on a
        // slate are told apart by an apostrophe.
        vm.normProjName = function (raw) {
            var s = LineStarUtility.removeDiacritics(String(raw == null ? '' : raw)).toLowerCase();
            s = s.replace(/\([^)]*\)/g, ' ');       // "(Q)", "(NYG)", "(P)"
            s = s.replace(/[.'\x60]/g, '');         // T.J. -> TJ, O'Neal -> ONeal
            s = s.replace(/[^a-z0-9]+/g, ' ');      // hyphens, slashes, anything left

            var parts = s.split(' ');
            var out = [];
            for (var i = 0; i < parts.length; i++) {
                if (!parts[i].length) { continue; }
                // a suffix is only noise when there is a name in front of it
                if (NAME_SUFFIXES[parts[i]] && out.length > 1) { continue; }
                out.push(parts[i]);
			}
            return out.join(' ');
		};

        // The same with the spaces closed up: catches "DeAndre"/"De Andre" and
        // "VanJefferson"/"Van Jefferson" without needing a distance pass.
        vm.keyProjName = function (raw) { return vm.normProjName(raw).replace(/ /g, ''); };

        // Teams break ties and nothing else. Feeds disagree on abbreviations
        // (WAS/WSH, JAX/JAC), so a team mismatch never rejects a match that is
        // otherwise good - it just fails to help.
        vm.normProjTeam = function (raw) {
            return String(raw == null ? '' : raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
		};

        // ---- the slate, indexed under every form we might be handed ----
        vm.projNameIndex = null;
        vm.projNameIndexSig = '';
        vm.projNameIndexSrc = null;   // the array itself, so a rebuilt list of the same length cannot be mistaken for the old one

        vm.buildProjNameIndex = function () {
            var sals = vm.salaryListForSelSlateALL || [];
            var sig = (vm.selectedSlate != null ? vm.selectedSlate.Id : 0) + ':' + sals.length;
            if (vm.projNameIndex != null && vm.projNameIndexSig === sig && vm.projNameIndexSrc === sals) { return vm.projNameIndex; }

            var idx = { sid: {}, pid: {}, full: {}, key: {}, initLast: {}, last: {} };
            var add = function (bucket, k, s) {
                if (!k) { return; }
                if (bucket[k] == null) { bucket[k] = []; }
                bucket[k].push(s);
			};

            for (var i = 0; i < sals.length; i++) {
                var s = sals[i];
                idx.sid[String(s.Id)] = s;
                idx.pid[String(s.PID)] = s;

                var n = vm.normProjName(s.Name);
                if (!n) { continue; }
                add(idx.full, n, s);
                add(idx.key, n.replace(/ /g, ''), s);

                var parts = n.split(' ');
                if (parts.length > 1) {
                    var last = parts[parts.length - 1];
                    add(idx.initLast, parts[0].charAt(0) + last, s);
                    add(idx.last, last, s);
				}
			}

            vm.projNameIndex = idx;
            vm.projNameIndexSig = sig;
            vm.projNameIndexSrc = sals;
            return idx;
		};

        // ---- matches the user made by hand ----
        // Matching "Hockenson, T.J." yourself once and being asked again next
        // week is the complaint this exists to answer. Keyed by PID rather than
        // by salary id so the memory carries into next week's slate, and capped
        // because it is one more thing sharing the origin's storage budget.
        var PROJ_ALIAS_MAX = 400;

        vm.projAliases = null;
        vm.projAliasesFor = null;   // which storage key the cache above belongs to
        vm.projAliasKey = function () { return 'fscProjAlias_' + vm.Sport + '_' + vm.Site; };

        vm.loadProjAliases = function () {
            var k = vm.projAliasKey();
            if (vm.projAliases != null && vm.projAliasesFor === k) { return vm.projAliases; }

            var raw = null;
            try { raw = localStorage.getItem(k); } catch (e) { }
            try { vm.projAliases = raw ? JSON.parse(raw) : {}; } catch (e) { vm.projAliases = {}; }
            vm.projAliasesFor = k;
            return vm.projAliases;
		};

        vm.saveProjAliases = function () {
            try { localStorage.setItem(vm.projAliasKey(), angular.toJson(vm.projAliases || {})); } catch (e) { }
		};

        vm.rememberProjAlias = function (sourceName, sal) {
            if (sal == null) { return; }
            var k = vm.keyProjName(sourceName);
            if (!k) { return; }
            var m = vm.loadProjAliases();

            // An alias the ladder already resolves on its own is dead weight
            // against the cap - and worse, it would pin that name to today's
            // answer even after the ladder learns to do better.
            var auto = vm.matchProjRow(sourceName, '', null, true);
            if (auto != null && auto.sal != null && String(auto.sal.PID) === String(sal.PID)) {
                if (m[k] != null) { delete m[k]; vm.saveProjAliases(); }
                return;
			}

            m[k] = { pid: sal.PID, n: sal.Name, t: new Date().getTime() };

            var keys = Object.keys(m);
            if (keys.length > PROJ_ALIAS_MAX) {
                keys.sort(function (a, b) { return (m[a].t || 0) - (m[b].t || 0); });
                for (var i = 0; i < keys.length - PROJ_ALIAS_MAX; i++) { delete m[keys[i]]; }
			}
            vm.saveProjAliases();
		};

        vm.forgetProjAlias = function (sourceName) {
            var k = vm.keyProjName(sourceName);
            if (!k) { return; }
            var m = vm.loadProjAliases();
            if (m[k] != null) { delete m[k]; vm.saveProjAliases(); }
		};

        // ---- the ladder ----
        // Stops at the first rung that resolves to exactly one player. `how`
        // rides back with the result so the import list can flag a guess.
        vm.matchProjRow = function (name, team, lineStarId, skipAlias) {
            var idx = vm.buildProjNameIndex();
            var t = vm.normProjTeam(team);

            // One candidate wins outright; several go to the team column, the
            // only tiebreaker here worth trusting. requireTeam forces that check
            // even for a lone candidate - used by the loosest rung.
            var pick = function (list, how, requireTeam) {
                if (list == null || !list.length) { return null; }
                if (requireTeam || list.length > 1) {
                    if (!t) { return null; }
                    var hit = null, n = 0;
                    for (var i = 0; i < list.length; i++) {
                        if (vm.normProjTeam(list[i].PTEAM) === t) { hit = list[i]; n++; }
					}
                    return (n === 1) ? { sal: hit, how: how } : null;
				}
                return { sal: list[0], how: how };
			};

            // 1. our own export coming back in - exact by construction. A stale
            //    id from another slate is simply not in the index and falls
            //    through to the name.
            if (lineStarId != null && String(lineStarId).length) {
                var byId = idx.sid[String(lineStarId).trim()];
                if (byId != null) { return { sal: byId, how: 'id' }; }
			}

            var key = vm.keyProjName(name);
            if (!key) { return null; }

            // 2. a match this user already made by hand
            if (!skipAlias) {
                var a = vm.loadProjAliases()[key];
                if (a != null) {
                    var byPid = idx.pid[String(a.pid)];
                    if (byPid != null) { return { sal: byPid, how: 'saved' }; }
				}
			}

            var norm = vm.normProjName(name);
            var r;

            // 3. the name as written, then with its spaces closed up
            r = pick(idx.full[norm], 'exact'); if (r) { return r; }
            r = pick(idx.key[key], 'exact'); if (r) { return r; }

            // 4. "Hockenson, T.J." - reachable only because the CSV parser now
            //    keeps that comma inside its quotes instead of splitting on it
            if (String(name).indexOf(',') >= 0) {
                var halves = String(name).split(',');
                if (halves.length === 2 && halves[0].trim().length && halves[1].trim().length) {
                    var flip = vm.normProjName(halves[1] + ' ' + halves[0]);
                    r = pick(idx.full[flip], 'exact'); if (r) { return r; }
                    r = pick(idx.key[flip.replace(/ /g, '')], 'exact'); if (r) { return r; }
				}
			}

            var parts = norm.split(' ');
            if (parts.length > 1) {
                var last = parts[parts.length - 1];

                // 5. first initial plus surname: "T. Hockenson" against "T.J.
                //    Hockenson", "Ken Walker" against "Kenneth Walker III".
                //    Two players sharing both (M. Thomas / M. Thomas) yield two
                //    candidates and correctly resolve to nothing.
                r = pick(idx.initLast[parts[0].charAt(0) + last], 'fuzzy'); if (r) { return r; }

                // 6. surname alone - loose enough that it demands the team
                //    column to confirm, even when only one player carries it
                r = pick(idx.last[last], 'fuzzy', true); if (r) { return r; }
			}

            return null;
		};

        // kept for callers that have only a name and want only the player
        vm.findSalaryWithName = function (name) {
            var r = vm.matchProjRow(name, '', null, false);
            return (r != null) ? r.sal : null;
		};
        vm.uploadedProjItems = [];
        vm.uploadProjFileName = '';
        vm.uploadDataMode = 0;
        vm.onImportProjections = function(){
            if (LineStar.IsPremium != 1) {
                return;
            }
            vm.showPopupSettingsPanel = 0;
            vm.openProjManager('list');
		};
        vm.onDeleteAllLineupSets = function(){
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a premium LineStar member to do this.');
                return;
            }
            var sets = Array.from(vm.periodData.Sets);
            for(var i=0; i<sets.length;i++){
                vm.onDeleteSet(sets[i]);
			}
            vm.updateLineupSetCounts();
            vm.showtoast('Your lineups have been deleted.');
		};

        vm.reduceSorters = function(){
            var srtList = [];
            for(var i=0; i <vm.sorters.length;i++){
                var s = vm.sorters[i];
                if(s.Sport == 0 || s.Sport == LineStar.Sport){
                    srtList.push(s);
                }
			}
            vm.sorters = srtList;
		};
        vm.reduceSorters();

        vm.getSorterMethod = function(method){
            for(var i=0; i <vm.sorters.length;i++){
                if(vm.sorters[i].Method == method){
                    return vm.sorters[i];
				}
			}
            return null;
		};
        vm.selectedSorter = vm.getSorterMethod(vm.sortMethod);

        //
        vm.selectedSlate = fscInfo.selectedSlate;
        fscInfo.registerNewListener(function (slate) {
            vm.selectedSlate = slate;
            vm.onSlateChanged();
        });

        fscInfo.regsterModListener(function (mods) {
            var salDict = vm.salariesPerSlate[vm.selectedSlate.Id];
            if (salDict == null) { return; }
            var optSettings = vm.getOptiSettingsObj();
            for (var i = 0; i < mods.length; i++) {
                var ps = salDict[mods[i].PlayerSalaryId];
                if (ps != null) {
                    var m = vm.findOrCreateUserMod(ps);
                    m.ProjLock = mods[i].ProjLock;
                    m.Flags = mods[i].Flags;
                    m.Loved = mods[i].Loved;
                    m.MaxExp = mods[i].MaxExp;

                    vm.updateSalaryWithMod(ps, m, optSettings);
                }
            }
        });

        fscInfo.regsterFilterImportListener(function (fd) {
            $scope.$apply(() => {
                vm.showFilterPopup();
                vm.importStatFilterFromJson(fd);
            });
        });

        vm.onPlayerSwapped = function(salToAdd){
            var lineups = [];
            var slate = vm.getSlate(vm.replacingSet.SetInfo.SlateId);

            if(vm.replacingAllLineups == 0){
                lineups.push(vm.replacingLineup);
			}else{
                lineups = vm.replacingSet.Lineups;
			}

            var lineupsAdded = 0;
            var lineupsFailed = 0;

            for(var i=0; i < lineups.length; i++){
                var lits =lineups[i].LineupItems;
                for(var j=0; j<lits.length;j++){
                    var sal = lits[j].Salary;
                    if(sal.Id == vm.replacingPlayer.Id){

                        if(vm.doesPlayerFitLineup(slate, lineups[i], salToAdd, sal)){
                            lits[j].Salary = salToAdd;
                            lits[j].SalaryId = salToAdd.Id;
                            lineupsAdded++;
						}else{
                            lineupsFailed++;
						}
                    }
				}
			}

            if(lineupsFailed == 0){
                vm.showtoast('Successfully added ' + salToAdd.Name + " to " + lineupsAdded + ' lineups.');
                vm.showPlayerPopupSelector = false;
			}
            else if(lineupsFailed > 0){
                //vm.showtoast('Added ' + salToAdd.Name + " to " + lineupsAdded + ' lineups. They did not fit into ' + lineupsFailed + ' lineups.');  
                vm.replacingPlayerMessage = 'Added ' + salToAdd.Name + " to " + lineupsAdded + ' lineups. They did not fit into ' + lineupsFailed + ' lineups.';
            }

            if(lineupsAdded > 0){
                vm.processLineupSetStatsSet(vm.replacingSet);
                vm.replacingSet.needsSave = 1;
                vm.saveSetChanges_debounce();     
			}
		};

        vm.onReplacePlayer = function(set, lineup, li, all, event){

            vm.hidePopupElementsOnClick();
            vm.replacingSet = set;
            vm.replacingLineup = lineup;
            vm.replacingPlayer = li.Salary;
            vm.replacingAllLineups = all;
            vm.showPlayerPopupSelector = true;
            vm.replacePlayerPos = li.req.Positions;
            vm.replacePlayerWithPlayers = [];
            vm.replacingPlayerMessage = null;

            var slate = vm.getSlate(lineup.SlateId);
            var salDictForSlate = vm.salariesPerSlate[lineup.SlateId];

            var salLeft = (slate.SalaryCap - lineup.Salary) + li.Salary.SAL;

            for(var key in salDictForSlate){
                var sal = salDictForSlate[key];
                if(sal == null || sal == undefined){
                    continue;        
				}

                if(sal.UserPP > 0 && vm.doesPlayerFitIntoSlot(li, sal)){
                    sal.SalaryExceedsBudget = (sal.SAL > salLeft);
                    sal.DoesntFitLineup = false;

                    sal.ValidForLineup = vm.doesPlayerFitLineup(slate, lineup, sal, li.Salary);

                    vm.replacePlayerWithPlayers.push(sal);
				}
			}

            vm.replacePlayerWithPlayers.sort(function (a, b) {
                  var Aa = a.SAL;
                  var Bb = b.SAL;

                  if(Aa == Bb){
                    Aa = a.UserPP;
                    Bb = b.UserPP;
				  }

                  return Bb-Aa;
            });

            var firstPlayerBelowSal = null;
            for(var i=0; i < vm.replacePlayerWithPlayers.length; i++){
                var sal = vm.replacePlayerWithPlayers[i];
                if(sal.SAL < salLeft){
                    firstPlayerBelowSal = sal;
                    break;
				}
			}

            event.stopPropagation();

            if(firstPlayerBelowSal != null){
                setTimeout(function(){
                    var row = $('.replacePlayerTable').find('tr[data-playerid="' + firstPlayerBelowSal.PID + '"]');
                    row[0].scrollIntoView({ behavior: 'smooth', block: 'start'});
			    }, 200);
            }

            return false;
		};

        vm.doesPlayerFitLineup = function(slate, lineup, salToAdd, salToRemove){

            var it = lineup.LineupItems;
            var playersOnTeam = 0;
            var playerInLineup = false;
            var teams = {};
            var games = {};
            var salLeft = (slate.SalaryCap - lineup.Salary);

            if(salToRemove != null){ 
                salLeft += salToRemove.SAL;
            }

            for(var i=0; i < it.length; i++){
                var ps = it[i].Salary;
                if(salToRemove != null && ps.Id == salToRemove.Id){
                    continue;        
				}

                if(ps.PID == salToAdd.PID){
                    playerInLineup = true;
				}
                if(ps.PTID == salToAdd.PTID){
                    playersOnTeam++;           
				}

                if(!(ps.PTID in teams)){
                    teams[ps.PTID] = 0;
				}

                teams[ps.PTID]++;
                games[ps.GID] = "";
			}

            if(!(salToAdd.PTID in teams)){
                teams[salToAdd.PTID] = 1;
			}
            if(!(salToAdd.GID in games)){
                games[salToAdd.GID] = "";
			}

            if(playerInLineup || 
               salToAdd.SAL > salLeft ||
              (playersOnTeam+1) > slate.Restriction_MaxPlayersPerTeam || 
               Object.keys(teams).length < slate.Restriction_MinTeams || 
               Object.keys(games).length < slate.Restriction_MinGames){
                return false;
			}

            return true;            
		};

        vm.showMatchupSetsPopup = false;
        vm.movingLineup = null;
        vm.moveLineupToSets = [];
        vm.movingLineups = null;    // bulk move: array of selected lineups (vs the single vm.movingLineup)
        vm.movingFromSet = null;

        vm.onMoveLineup = function(set, lineup){

            vm.movingLineups = null;   // single move - keep the bulk path in onMoveLineupToSet off
            vm.movingLineup = lineup;
            vm.movingLineup.moveSet = set;
            vm.showMatchupSetsPopup = true;
            vm.moveLineupToSets = [];

            if(set == null){
                var newSet = vm.onCreateEmptyLineupSet(0);
                newSet.SetInfo.SetName = "CREATE NEW SET";
                newSet.needsPush = 1;
                vm.moveLineupToSets.push(newSet);
			}

            var sets = vm.periodData.Sets;
            for(var i=0; i < sets.length; i++){
                var s = sets[i];
                if (set != null && set == s) {
                    continue;
                }
                if((set != null && set.SetInfo.SlateId == s.SetInfo.SlateId) || (lineup.SlateId == s.SetInfo.SlateId)){
                    vm.moveLineupToSets.push(s);
				}
			}
		};

        vm.onMoveLineupToSet = function(set){

            // bulk move: a set of selected lineups (vm.movingLineups) rather than one
            if (vm.movingLineups && vm.movingLineups.length) {
                if (set.needsPush == 1) {
                    set.SetInfo.SetName = "From Builder";
                    vm.periodData.Sets.splice(0, 0, set);
                }
                var bsrc = vm.movingFromSet;
                for (var bmi = 0; bmi < vm.movingLineups.length; bmi++) {
                    var bmlu = vm.movingLineups[bmi];
                    if (bsrc) {
                        var bsidx = bsrc.Lineups.indexOf(bmlu);
                        if (bsidx >= 0) { bsrc.Lineups.splice(bsidx, 1); }
                    }
                    bmlu.Selected = false;
                    set.Lineups.splice(0, 0, bmlu);
                }
                if (bsrc) { bsrc.needsSave = 1; bsrc.selectedCnt = 0; vm.processLineupSetStatsSet(bsrc); }
                set.needsSave = 1;
                vm.processLineupSetStatsSet(set);
                vm.movingLineups = null;
                vm.movingFromSet = null;
                vm.showMatchupSetsPopup = false;
                vm.saveSetChanges_debounce();
                vm.openLineupsDialog();
                return;
            }
        
            if(vm.movingLineup.moveSet != null){
                var idx = vm.movingLineup.moveSet.Lineups.indexOf(vm.movingLineup);
                vm.movingLineup.moveSet.Lineups.splice(idx, 1);
                vm.movingLineup.moveSet.needsSave = 1;
                vm.processLineupSetStatsSet(vm.movingLineup.moveSet);
            }

            if(set.needsPush == 1){
                set.SetInfo.SetName = "From Builder";
                vm.periodData.Sets.splice(0, 0, set);     
			}

            //
            set.Lineups.splice(0, 0, vm.movingLineup);
            set.needsSave = 1;
            vm.processLineupSetStatsSet(set);
            
            //
            vm.movingLineup.moveSet = null
            vm.movingLineup = null;

            vm.showMatchupSetsPopup = false;
            vm.saveSetChanges_debounce();

            //vm.showLineupBuilder = 0;
            vm.openLineupsDialog();
		};

        vm.onExportLineup = function(set, lineup){
            var lineups = [];
            lineups.push(lineup);
            vm.onExportLineups(lineups, set);
        };

        vm.returnToProjections = function () {
            vm.showProjections = 1;
            vm.clearFilters();
            
            setTimeout(function () {
                vm.resizeTable();
            }, 750);
        };

        vm.onPopulateBuilderWithLineup = function(set, lineup){
            vm.showLineupBuilder = 1;
            vm.showProjections = 1;
            vm.clearCurrentLineup();

            if(lineup.SlateId != vm.selectedSlate.Id){
               fscInfo.vm.selectSlateFromId(lineup.SlateId);
			}

            var li = lineup.LineupItems;
            for(var i=0; i<li.length;i++){
                if(li[i] != null && li[i].Salary != null){
                    vm.addPlayerToLineupBuilder(li[i].Salary);
                }
			}
		};

        vm.onLineupSetNameChanged = function(set){
            set.needsSave = 1;
            vm.saveSetChanges_debounce();
		};

        vm.onLineupNameChanged = function(set, lineup){
            set.needsSave = 1;
            vm.saveSetChanges_debounce();
		};
        
        vm.onDeleteLineupsBefore = function(set, lineup){
            var idx = set.Lineups.indexOf(lineup);
            set.Lineups.splice(0, idx);
            set.needsSave = 1;
            vm.processLineupSetStatsSet(set);
            vm.saveSetChanges_debounce();
		};

        vm.onDeleteLineupsAfter = function(set, lineup){
            var idx = set.Lineups.indexOf(lineup);
            set.Lineups.splice(idx+1, set.Lineups.length-idx-1);
            set.needsSave = 1;
            vm.processLineupSetStatsSet(set);
            vm.saveSetChanges_debounce();
		};

        // select (check) this lineup + everything before/after it, so the range can be
        // acted on via the bulk action bar (these replaced the old Delete Before/After)
        vm.onSelectLineupsBefore = function (set, lineup) {
            if (!set || !set.Lineups) { return; }
            var idx = set.Lineups.indexOf(lineup);
            if (idx < 0) { return; }
            for (var i = 0; i <= idx; i++) { set.Lineups[i].Selected = true; }
            vm.onLineupSelectChanged(set);
        };
        vm.onSelectLineupsAfter = function (set, lineup) {
            if (!set || !set.Lineups) { return; }
            var idx = set.Lineups.indexOf(lineup);
            if (idx < 0) { return; }
            for (var i = idx; i < set.Lineups.length; i++) { set.Lineups[i].Selected = true; }
            vm.onLineupSelectChanged(set);
        };

        vm.showSortDropDown = function(set){
            vm.showAngularItem(set);
		};

        vm.showLineupMore = function(lineup){
            vm.showAngularItem(lineup);
		};

        vm.showLineupItemMore = function(li){
            vm.showAngularItem(li);
        };

        vm.onCreateEmptyLineupSet = function(pushToSets){
            var set = { SetInfo: { SetName: "Builder Set", CreatedUtc: new Date().toISOString(), GeneratedAt: (new Date()).getTime(), LocalId: vm.getRandomLineupId(), PeriodId: LineStar.PeriodId, Site: LineStar.Site, SlateId: vm.selectedSlate.Id, Model: 0, Sport: LineStar.Sport }, Lineups: [], needsSave: 0, ShowItem: false };
            if(pushToSets){
                vm.periodData.Sets.push(set);
            }
            return set;
		};

        vm.onSortSet = function(set, method, event){
            set.ShowItem = false;

            set.Lineups.sort(function (a, b) {
                  var Aa = (method==0) ? a.PP : (method==1) ? a.PS : a.Owned;
                  var Bb = (method==0) ? b.PP : (method==1) ? b.PS : b.Owned;
                  return Bb-Aa;
            });

            set.needsSave = 1;
            vm.saveSetChanges_debounce();
            event.stopPropagation();
		};

        // Lineups are ordered by a single persistent selection (Projected/Scored/Owned)
        // applied to EVERY set automatically (see processLineupSetStatsSet). The picker
        // just changes that selection - it no longer reorders + saves an individual set.
        vm.lineupSortLabels = { 0: 'Projected', 1: 'Scored', 2: 'Owned', 3: 'Default', 4: 'Consensus', 5: 'Salary' };

        // The lineups TABLE has sortable column headers; the card view has the
        // "Sort: X" menu button. They were separate state, so clicking a column
        // header re-ordered the table while the button carried on naming
        // whatever it was last set to. These maps make it one concept with two
        // entry points - each setter writes both sides.
        //
        // Method 3 (Default / as-optimized) maps to a null table key, which is
        // exactly what the header's 3rd click produces, so the two agree there
        // too. Salary exists only because the table has that column; without a
        // method for it the button would have nothing to show when it's picked.
        vm.luSortKeyByMethod = { 0: 'PP', 1: 'PS', 2: 'Owned', 3: null, 4: 'ConsPP', 5: 'Salary' };
        vm.luMethodBySortKey = { 'PP': 0, 'PS': 1, 'Owned': 2, 'ConsPP': 4, 'Salary': 5 };

        /* ---- User-defined lineup columns -------------------------------------
           Pick any Matchup Data stat and get it totalled across the lineup's
           players as a new sortable column.

           Each entry is { id, col, label, key }, where key is 'luc_<id>_<col>'
           slugged. Totals are STAMPED onto each lineup under that key rather
           than computed in a binding, for two reasons: a getter would re-walk
           every player on every digest, and stamping means luTableRows' generic
           `a[key] - b[key]` comparator sorts these for free, exactly like PP.

           Totals are sums. Every lineup in a set has the same slot count, so a
           sum is order-equivalent to an average - one aggregation serves both
           readings and there is no toggle to explain. */
        vm.luCustomCols = [];
        /* Same {ShowItem} shape the other menus use, so showAngularItem /
           hideAngularItemsOnClick close it on an outside click like everything
           else - a bare boolean would have stayed open until Cancel. */
        vm.luCustomPicker = { ShowItem: false };
        vm.luCustomPickId = null;     // selected MatchupData group in the picker
        vm.luCustomPickCol = null;    // selected column within that group

        vm.luCustomKey = function (id, col) {
            return 'luc_' + id + '_' + String(col).replace(/[^A-Za-z0-9]/g, '');
        };

        /* One pass over the group's PlayerMatchups -> {bySid, byPid}, mirroring
           buildExtraStatIndex. The generic getPlayerMatchupDataEleVal does a
           linear scan per player, which would be O(players x matchups) for every
           lineup on the board. */
        vm.luBuildCustomIndex = function (c) {
            c.bySid = {};
            c.byPid = {};
            if (!vm.periodData || !vm.periodData.MatchupData) { return false; }
            var md = vm.getMatchupDataColById(c.id);
            var idx = vm.getMatchupDataColIdxForName(md, c.col);
            if (md == null || idx < 0) { return false; }   // feed absent this period
            for (var i = 0; i < md.PlayerMatchups.length; i++) {
                var pm = md.PlayerMatchups[i];
                /* same SID-or-PlayerId fallback every other matchup lookup uses */
                if (pm.SID > 0) { c.bySid[pm.SID] = pm.Values[idx]; }
                else { c.byPid[pm.PlayerId] = pm.Values[idx]; }
            }
            return true;
        };

        vm.luCustomPlayerVal = function (c, sal) {
            if (sal == null) { return 0; }
            var raw = c.bySid[sal.Id];
            if (raw === undefined) { raw = c.byPid[sal.PID]; }
            /* feeds carry strings, and '-' / '' for players they don't cover */
            var n = parseFloat(raw);
            return isFinite(n) ? n : 0;
        };

        /* Stamps every custom column onto every lineup. Called after the totals
           loop on each refresh, and whenever a column is added or removed. */
        vm.luApplyCustomCols = function () {
            var sets = (vm.periodData && vm.periodData.Sets) ? vm.periodData.Sets : [];
            for (var ci = 0; ci < vm.luCustomCols.length; ci++) {
                var c = vm.luCustomCols[ci];
                c.resolved = vm.luBuildCustomIndex(c);
                for (var si = 0; si < sets.length; si++) {
                    var lus = sets[si].Lineups || [];
                    for (var lidx = 0; lidx < lus.length; lidx++) {
                        var l = lus[lidx], tot = 0;
                        /* the slate's salary dict, for the fallback below */
                        var sd = (vm.salariesPerSlate && l.SlateId != null) ? vm.salariesPerSlate[l.SlateId] : null;
                        for (var k = 0; k < l.LineupItems.length; k++) {
                            var itm = l.LineupItems[k];
                            var sal = itm.Salary;
                            /* itm.Salary is only attached by the sets loop. This
                               can run before that (on a reload, off the back of
                               luLoadCustomCols), so resolve from the slate dict
                               rather than silently totalling zeros. */
                            if (sal == null && sd) { sal = sd[itm.SalaryId]; }
                            tot += vm.luCustomPlayerVal(c, sal);
                        }
                        l[c.key] = tot;
                    }
                }
            }
        };

        vm.luCustomColsAvailable = function () {
            return !!(vm.periodData && vm.periodData.MatchupData && vm.periodData.MatchupData.length);
        };

        vm.luCustomPickCols = function () {
            var d = vm.periodData && vm.periodData.MatchupDataDict;
            var g = (d && vm.luCustomPickId != null) ? d[vm.luCustomPickId] : null;
            return (g && g.Columns) ? g.Columns : [];
        };

        vm.luAddCustomCol = function () {
            if (vm.luCustomPickId == null || !vm.luCustomPickCol) { return; }
            var key = vm.luCustomKey(vm.luCustomPickId, vm.luCustomPickCol);
            for (var i = 0; i < vm.luCustomCols.length; i++) {
                if (vm.luCustomCols[i].key === key) { vm.luCustomPicker.ShowItem = false; return; }
            }
            var grp = vm.periodData.MatchupDataDict[vm.luCustomPickId];
            vm.luCustomCols.push({
                id: vm.luCustomPickId,
                col: vm.luCustomPickCol,
                /* group name in the tooltip, not the header - "Opp Rank" fits a
                   column, "Season Matchup Data: Opp Rank" does not */
                label: vm.luCustomPickCol,
                group: (grp && grp.Name) ? grp.Name : '',
                key: key
            });
            vm.luCustomPicker.ShowItem = false;
            vm.luCustomPickCol = null;
            vm.luApplyCustomCols();
            vm.luSaveCustomCols();
        };

        vm.luRemoveCustomCol = function (key, event) {
            if (event) { event.stopPropagation(); }
            for (var i = 0; i < vm.luCustomCols.length; i++) {
                if (vm.luCustomCols[i].key === key) { vm.luCustomCols.splice(i, 1); break; }
            }
            /* if the table was sorted by the column just removed, fall back to
               the set's natural order rather than a key nothing carries */
            if (vm.luTableSort === key) { vm.luTableSort = null; vm.luTableSortDesc = true; }
            vm.luSaveCustomCols();
        };

        /* Persisted per sport - the available matchup groups differ by sport, so
           a saved NFL pick is meaningless on an MLB slate. */
        vm.luSaveCustomCols = function () {
            var slim = [];
            for (var i = 0; i < vm.luCustomCols.length; i++) {
                slim.push({ id: vm.luCustomCols[i].id, col: vm.luCustomCols[i].col });
            }
            try { localStorage.setItem('luCustomCols_' + LineStar.Sport, JSON.stringify(slim)); } catch (e) { }
        };

        vm.luLoadCustomCols = function () {
            var raw = null;
            try { raw = localStorage.getItem('luCustomCols_' + LineStar.Sport); } catch (e) { return; }
            if (!raw) { return; }
            var slim = [];
            try { slim = JSON.parse(raw) || []; } catch (e) { return; }
            vm.luCustomCols = [];
            for (var i = 0; i < slim.length; i++) {
                var grp = (vm.periodData && vm.periodData.MatchupDataDict) ? vm.periodData.MatchupDataDict[slim[i].id] : null;
                vm.luCustomCols.push({
                    id: slim[i].id,
                    col: slim[i].col,
                    label: slim[i].col,
                    group: (grp && grp.Name) ? grp.Name : '',
                    key: vm.luCustomKey(slim[i].id, slim[i].col)
                });
            }

            /* Rebuilding above produces bare objects - no index, and no
               `resolved` flag, which the cell binding uses to decide between a
               value and a dash. Without this call a reloaded column rendered
               its header but never its numbers, because the only other
               luApplyCustomCols() runs at the end of the sets loop and may
               already have fired (against the previous, empty list) by the time
               this runs.
               Calling it here makes the pair order-independent: whichever of
               the two happens second produces the correct state, and running it
               twice is harmless. */
            vm.luApplyCustomCols();
        };
        vm.sortLineupsBySetting = function (set) {
            if (!set || !set.Lineups) { return; }
            var m = vm.lineupSortMethod;
            if (m == 3) {   // Default - the order the optimizer gave us the set (OrigIdx)
                set.Lineups.sort(function (a, b) {
                    var ai = (a.OrigIdx == null) ? 0 : a.OrigIdx;
                    var bi = (b.OrigIdx == null) ? 0 : b.OrigIdx;
                    return ai - bi;
                });
                return;
            }
            set.Lineups.sort(function (a, b) {
                var Aa = (m == 0) ? a.PP : (m == 1) ? a.PS : (m == 4) ? a.ConsPP : (m == 5) ? a.Salary : a.Owned;
                var Bb = (m == 0) ? b.PP : (m == 1) ? b.PS : (m == 4) ? b.ConsPP : (m == 5) ? b.Salary : b.Owned;
                return Bb - Aa;
            });
        };

        // Consensus only exists for slates an industry feed covers. Used to
        // hide the sort option and the card total rather than offering a sort
        // that would silently order everything by zero.
        vm.lineupSortIsConsensus = function () {
            return vm.lineupSortMethod == 4;
        };
        vm.setLineupSortMethod = function (method, event) {
            if (event) { event.stopPropagation(); }
            vm.lineupSortMethod = method;
            LineStarUtility.saveSettingInt("lineupSortMethod", method);
            vm.lineupSortMenu.ShowItem = false;
            // mirror into the table view so its header arrow agrees. Set
            // directly rather than calling setLuTableSort - that would toggle
            // direction/clear on a repeat pick instead of just selecting.
            vm.luTableSort = vm.luSortKeyByMethod[method];
            vm.luTableSortDesc = true;
            var sets = (vm.periodData && vm.periodData.Sets) ? vm.periodData.Sets : [];
            for (var i = 0; i < sets.length; i++) { vm.sortLineupsBySetting(sets[i]); }
        };

        vm.onModelSelected = function(mod){
            vm.generateModelVal = mod.Method;
            LineStarUtility.saveSettingInt("generateModelVal_" + LineStar.Sport, mod.Method);
            vm.showOptimizerModels = 0;
            vm.optModelsOpen = false;   // return to the base pane when picked from the gear flyout
            vm.updateSelectedGenerateModel();
		};

        vm.decreaseProjection = function (p) {
            p.ProjSaving = 1;
            vm.onMemberChangedPlayerProj(p, parseFloat(p.UserPP) - 1);
		};
        vm.increaseProjection = function (p) {
            p.ProjSaving = 1;
            vm.onMemberChangedPlayerProj(p, parseFloat(p.UserPP) + 1);
		};
        vm.resetProjection = function (p) {
            p.ProjSaving = 1;
            p.ProjError = 0;
            vm.onMemberChangedPlayerProj(p, p.PP);
        };

        vm.onSaveAllProjChanges = function () {
            for (var i = 0; i < vm.pendingProjSaves.length; i++) {
                var p = vm.pendingProjSaves[i];
                if (!LineStarUtility.isNumeric(p.UserPP)) {
                    p.ProjError = 1;
                    p.ProjSaving = 0;
                } else {
                    p.ProjError = 0;
                    p.ProjSaving = 1;
                    vm.onMemberChangedPlayerProj(p, p.UserPP);
                }
            }
            vm.pendingProjSaves = [];
        };
        vm.saveProjChanges_debounce = LineStarUtility.debounce(vm.onSaveAllProjChanges, 750, $scope);
        vm.pendingProjSaves = [];

        vm.onProjChanged = function (p) {

            p.ProjSaving = 1;
            var idx = vm.pendingProjSaves.indexOf(p);

            if (p.UserPP.endsWith('.')) {
                if (idx >= 0) {
                    vm.pendingProjSaves.splice(idx, 1);
                }
                return;
            }

            if (idx < 0) {
                vm.pendingProjSaves.push(p);
            }
            vm.saveProjChanges_debounce();
		};

        vm.onMemberChangedPlayerProj = function(p, newProj){

            if (!LineStarUtility.isNumeric(newProj)) {
                p.ProjError = 1;
                return;
			}
            if(LineStar.IsPremium!=1){
                vm.showtoast('You must be a premium member in order to adjust projections.');
                return;
			}
            newProj = parseFloat(newProj);
            newProj = LineStarUtility.round(newProj, 2)

            // Straight into the active set. Back on the model number means
            // "no override", so the entry is removed rather than stored as a
            // value that happens to equal the baseline - otherwise the player
            // shows as adjusted forever and counts toward the adjusted filter.
            vm.writeProjToActiveSet(p, (newProj === p.PP) ? null : newProj);

            // Re-resolve against whatever the write just did. Fetched AFTER the
            // write, because on the My Projections source that write is what
            // creates the mod - and the mod is still the home of love/hate and
            // max exposure either way.
            var mod = vm.findUserMod(p);
            vm.updateSalaryWithMod(p, mod);
		};

        vm.saveStatusChanges = function(){
            console.log('save changes');
            if(vm.modsToSave.length > 0){
                //save a list to revert to if this fails
                var backup = vm.modsToSave;

                webService.savePlayerAdjustments(function(sucess, data){
                    if (!sucess) {
                        console.log('save failed');
                        for (var i = 0; i < backup.length; i++) {
                            if (vm.modsToSave.indexOf(backup[i]) < 0) {
                                vm.modsToSave.push(backup[i]);
                            }
                        }
                    } else {
                        var salDictForSlate = vm.salariesPerSlate[vm.selectedSlate.Id];
                        for (var i = 0; i < backup.length; i++) {
                            var mod = backup[i];
                            var p = salDictForSlate[mod.PlayerSalaryId];
                            if (p != null && p != undefined) {
                                p.ProjSaving = 0;
                            }
                        }
                    }
			    }, vm.modsToSave);
                
                vm.modsToSave = [];
            }
		};
        vm.saveChanges_debounce = LineStarUtility.debounce(vm.saveStatusChanges, 1200, $scope);
 
        // ---- toast queue. Explicit hide timer instead of jQuery .delay()
        // so hovering the toast can PAUSE the countdown (mouseleave resumes
        // with the remaining time). Queued messages wait out a short gap
        // after the previous fade so consecutive toasts read as separate
        // messages, and a "skip N queued" button on the toast dumps the
        // backlog for users who don't want the parade.
        vm._toastTimer = null;
        vm._toastPaused = false;
        vm._toastRemaining = 0;
        vm._toastShownAt = 0;

        vm._toastArm = function (ms) {
            clearTimeout(vm._toastTimer);
            vm._toastShownAt = Date.now();
            vm._toastRemaining = ms;
            vm._toastTimer = setTimeout(function () { vm._toastHide(); }, ms);
        };

        vm._toastHide = function () {
            clearTimeout(vm._toastTimer);
            vm._toastPaused = false;
            $('.toast').stop(true).fadeOut(420, function () {
                vm.toastActive = false;
                if (vm.toastQueue.length > 0) {
                    var next = vm.toastQueue.splice(0, 1)[0];
                    // breathing room between messages - back-to-back toasts
                    // otherwise morph into one another
                    setTimeout(function () { vm.showtoast(next); }, 900);
                }
            });
        };

        vm._toastSkipBtn = function () {
            var t = $('.toast');
            var n = vm.toastQueue.length;
            var btn = t.find('.toastSkip');
            if (n === 0) { btn.remove(); return; }
            if (btn.length === 0) {
                t.append('<span class="toastSkip" role="button" tabindex="0"></span>');
                btn = t.find('.toastSkip');
            }
            btn.text('Skip ' + n + ' queued');
        };

        vm.showtoast = function(tt) {
            if (vm.toastActive) {
                vm.toastQueue.push(tt);
                vm._toastSkipBtn();   // live-update the counter on the visible toast
                return;
            }
            vm.toastActive = true;
            var t = $('.toast');
            t.html('<span class="toastMsg">' + tt + '</span>');
            vm._toastSkipBtn();
            // snappy fades - the CSS fscToastIn keyframes add the slide-up
            // (transform only, so the two animations don't fight)
            t.stop(true).fadeIn(220);
            vm._toastArm((tt.length > 100) ? 10000 : 6000);
        };

        // hover pauses the countdown; leaving resumes what was left (with a
        // small floor so it never vanishes the instant the pointer exits)
        $(document).on('mouseenter', '.toast', function () {
            if (!vm.toastActive || vm._toastPaused) { return; }
            vm._toastPaused = true;
            clearTimeout(vm._toastTimer);
            vm._toastRemaining = Math.max(1500, vm._toastRemaining - (Date.now() - vm._toastShownAt));
        });
        $(document).on('mouseleave', '.toast', function () {
            if (!vm.toastActive || !vm._toastPaused) { return; }
            vm._toastPaused = false;
            vm._toastArm(vm._toastRemaining);
        });
        $(document).on('click', '.toast .toastSkip', function (e) {
            e.stopPropagation();
            vm.toastQueue = [];
            vm._toastHide();
        });

        vm.onShowAlertsView = function(ps, ele){
            var popupHtml = $('<div class="playerAlertPopup detachOnClick"><div class="playerAlertPopupHead">Player Alerts</div><div class="playerAlertArea"></div></div>');
            vm.populateAlertHtml(ps, popupHtml.find('.playerAlertArea'));

            // anchor rect captured NOW - currentTarget is nulled once the handler returns
            var anchor = ele.currentTarget || ele.target;
            var r = anchor.getBoundingClientRect();

            // Body-level fixed flyout (matchupTip-style placement: centered under
            // the anchor, clamped to the viewport, flipped above when there's no
            // room below). Appended into the clicked cell it inherited that host's
            // stacking context and rendered UNDER neighboring cards. The delay
            // keeps this click's own document detachOnClick sweep from removing
            // it immediately; the next click dismisses it as before.
            setTimeout(function(){
                $('body').append(popupHtml);
                var w = popupHtml.outerWidth(), h = popupHtml.outerHeight(), pad = 8, gap = 8;
                var left = Math.max(pad, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - pad - w));
                var top = r.bottom + gap;
                if (top + h > window.innerHeight - pad) {
                    var above = r.top - h - gap;
                    if (above > pad) { top = above; }
                }
                popupHtml.css({ left: left + 'px', top: top + 'px' });
            }, 100);

            return false;
        };

        vm.onShowSicScore = function (ps, ele) {

            var injuryNote = "";
            for (var i = 0; i < ps.Alerts.length; i++) {
                var a = ps.Alerts[i];
                if (a.Alert == 17 && a.Note.indexOf("SIC") >=0) {
                    injuryNote = a.Note;
                    break;
                }
            }

            var popupHtml = $('<div class="sicScorePopup detachOnClick"><img src="https://sicscore.com/static/media/logo-sic-wide.23b90f5d185777904f33.png"><div class="sicScoreNumber">' + ps.SIC + '</div><div class="sicScoreNote">' + injuryNote + '</div><div class="sicScoreDetails">SIC Score is the Sports Injury Central proprietary numerical injury grading system. Any score below 100 will indicate a health concern.</br><a href="https://sicscore.com/">sicscore.com</a></div></div>');
            var dom = $(ele.target);
            setTimeout(function () {
                dom.append(popupHtml);
            }, 100);

            return false;
        };

        vm.stackOptions = [];
        vm.showCreateStackItem = null;
        vm.showStackOptionsDialog = false;
        vm.createStackOpt = function () {
            var sl = vm.selectedSlate;
            if (!(sl.Mode == 4 || sl.Mode == 0)) {
                vm.showtoast("Sorry this slate mode can't stack at this time.");
                return;
            }

            var stkOpt = { v: 1, enabled: true, enabledStr: "Enabled", slateid: vm.selectedSlate.Id, stackSize: 3, positions: [], possiblePositions: [], teams: {}, options: JSON.parse(JSON.stringify(vm.periodData.StackingOptions)) };
            var pfs = vm.periodData.PositionFilters;
            var dict = {};
            var preferedStackVals = [];
            var ignorePos = [];

            if (vm.Sport == 1 || vm.Sport == 10 || vm.Sport == 11) {
                if (vm.stackOptions.length == 0) {
                    preferedStackVals.push('QB', 'WR', 'TE');
                } else if (vm.stackOptions.length == 1) {
                    if (vm.Sport == 10 && (LineStar.Site == 1 || LineStar.Site == 2)) {
                        preferedStackVals.push('QB', 'WR', 'TE');
                    } else {
                        preferedStackVals.push('RB', 'DST');
                    }
                    stkOpt.stackSize = 2;
                } else {
                    preferedStackVals.push('WR', 'TE', 'RB');
                    stkOpt.stackSize = 2;
                }
            } else if (vm.Sport == 6) {

                if (vm.Site == 2) {
                    preferedStackVals.push('C', 'W', 'D');
                } else {
                    preferedStackVals.push('C', 'LW', 'RW', 'D');
                }

                if (vm.Site == 4 && vm.stackOptions.length > 0) {
                    stkOpt.stackSize = 2;
                }
            } else if (vm.Sport == 3) {
                preferedStackVals.push('1B', '2B', '3B', 'SS', 'C', 'OF');
                ignorePos.push('SP', 'RP', 'P', 'UTIL');
            }

            for (var i = 0; i < pfs.length; i++) {
                var pos = pfs[i].PositionName.split(',');
                for (var j = 0; j < pos.length; j++) {
                    if (dict[pos[j]] == null) {
                        dict[pos[j]] = "1";
                        var ignore = false;

                        for (var x = 0; x < ignorePos.length; x++) {
                            if (ignorePos[x] === pos[j]) {
                                ignore = true;
                                break;
                            }
                        }

                        if (!ignore) {
                            var inc = (preferedStackVals.length == 0 || preferedStackVals.indexOf(pos[j]) >= 0);
                            stkOpt.possiblePositions.push({ PositionName: pos[j], included: inc });
                        }
                    }
                }

            }
            for (var i = 0; i < vm.teamsInSlate.length; i++) {
                stkOpt.teams[vm.teamsInSlate[i].Id] = "100";
            }
            stkOpt.teamsCntStr = "ALL";

            
            for (var i = 0; i < stkOpt.options.length; i++) {
                var opt = stkOpt.options[i];
                switch (opt.Option) {
                    case 2111:
                        opt.Value1 = 1;
                        break;
                    case 2001:
                        opt.Value1 = sl.stats.minSal;
                        opt.Value2 = sl.stats.maxSal;
                        opt.RangeMin = sl.stats.minSal;
                        opt.RangeMax = sl.stats.maxSal;
                        break;
                    case 2002:
                        opt.Value1 = 0;
                        opt.Value2 = Math.round(sl.stats.maxProj * 1.2);
                        opt.RangeMin = 0;
                        opt.RangeMax = Math.round(sl.stats.maxProj * 1.2);
                        break;
                    case 2004:
                        opt.Value1 = 0;
                        opt.Value2 = 100;
                        opt.RangeMin = 0;
                        opt.RangeMax = 100;
                        break;
                }

                if (opt.OptionType == 4) {
                    vm.initOptSlider(opt, 1);
                }else if (opt.OptionType == 1) {
                    opt.Checked = (opt.Value1 > 0);
                }

                opt.Val1 = opt.Value1;
                opt.Val2 = opt.Value2;
                opt.Changed = 0;
            }


            if (vm.stackOptions.length <= 2) {
                vm.stackOptions.push(stkOpt);
                vm.checkForInvalidStackState();
                vm.saveStackOptions();
            }
        };

        vm.closeStackOptionsDialog = function () {
            vm.showStackOptionsDialog = false;
            vm.showTeamStacksPopup = 1;
            vm.saveStackOptions();
        };

        vm.onToggleStackPos = function (pos) {
            pos.included = !pos.included;
            vm.saveStackOptions();
        };

        vm.loadStackOptions = function () {
            vm.stackOptions = [];
            var mode = (vm.selectedSlate != null) ? vm.selectedSlate.Mode : 0;
            var slateId = (vm.selectedSlate != null) ? vm.selectedSlate.Id : 0;
            var key = 'stacks_' + LineStar.Sport + '.' + LineStar.Site + '.' + mode;
            var items = vm.getLimitedStorageItem('ls_' + key, key + '.' + slateId);
            if (items == null) {
                var str = localStorage.getItem(key);
                if (str != null && str.length > 0) {
                    items = JSON.parse(str);
                }
            }
            
            if (items != null && items.length > 0) {
                for (var i = 0; i < items.length; i++) {
                    var itm = items[i];
                    var diffSlate = false;
                    if (itm.slateid != slateId) {
                        itm.teams = {};
                        for (var j = 0; j < vm.teamsInSlate.length; j++) {
                            itm.teams[vm.teamsInSlate[j].Id] = "100";
                        }
                        itm.teamsCntStr = "ALL";
                        itm.slateid = slateId;
                        diffSlate = true;
                    }

                    for (var j = 0; j < itm.options.length; j++) {
                        var opt = itm.options[j];

                        if (diffSlate) {
                            if (opt.Option == 2001) {
                                opt.RangeMax = opt.Value2 = opt.Val2 = (vm.selectedSlate != null) ? vm.selectedSlate.stats.maxSal : 100000;
                            } else if (opt.Option == 2002) {
                                var maxProj = (vm.selectedSlate != null) ? vm.selectedSlate.stats.maxProj : 100;
                                opt.RangeMax = opt.Value2 = opt.Val2 = Math.round(maxProj * 1.2);
                            }
                        }

                        if (opt.OptionType == 4) {
                            vm.initOptSlider(opt, 1);
                        }
                    }

                    vm.stackOptions.push(itm);
                }
                vm.saveStackOptions();
            }
            vm.updateStacksString();
        };

        vm.onStackOptionToggled = function (opt) {
            if (opt.OptionType == 1) {
                opt.Val1 = opt.Checked ? 1 : 0;
                opt.Value1 = opt.Val1;
                opt.Changed = 1;
            } else if (opt.OptionType == 2) {
                opt.Value1 = parseInt(opt.Val1);
                opt.Value2 = parseInt(opt.Val2);
                opt.Changed = 1;
            }
        };

        vm.stackOptionsStr = '';
        vm.stacksAreEnabled = false;

        vm.saveStackOptions = function () {
            if (vm.selectedSlate != null) {
                var str = angular.toJson(vm.stackOptions);
                var key = 'stacks_' + LineStar.Sport + '.' + LineStar.Site + '.' + vm.selectedSlate.Mode;
                localStorage.setItem(key, str);
                vm.pushLimitedStorageItem('ls_' + key, vm.stackOptions, key + '.' + vm.selectedSlate.Id, 6);
            }
            vm.updateStacksString();
        };

        vm.updateStacksString = function () {
            var stacksEnabled = 0;
            var sos = '';

            var o = vm.stackOptions;
            if (o != null) {
                for (var i = 0; i < 3; i++) {
                    var s = "0";
                    if (i < o.length && o[i].enabled) {
                        s = o[i].stackSize;
                        stacksEnabled++;
                    }
                    if (sos.length > 0) {
                        sos += "-";
                    }
                    sos += s;
                }
            }

            vm.stackOptionsStr = sos;
            vm.stacksAreEnabled = (stacksEnabled > 0);
        };

        vm.onToggleStackEnabled = function (stk) {
            stk.enabled = !stk.enabled;
            stk.enabledStr = stk.enabled ? "Enabled" : "Disabled";
            vm.checkForInvalidStackState();
            vm.saveStackOptions();
        };
        vm.showTeamStackPopup = function (stk) {
            vm.editingPosStackRule = null;   // this pane is shared - mode 3 must not linger
            var ts = vm.teamsInSlate;
            for (var i = 0; i < ts.length; i++) {
                var t = ts[i];
                var exp = stk.teams[t.Id];

                if (exp == null || exp == undefined) {
                    t.IsStacking = false;
                    t.maxExp = "0";
                } else {
                    t.IsStacking = (parseInt(exp) > 0);
                    t.maxExp = exp;
                }
            }
            vm.showCreateStackItem = stk;
            vm.teamPopupSelectorMode = 2;
            vm.dismissTooltips();
            if (vm.optStacksOpen) {
                // flyout context: open the team picker as an in-place pane
                // (back -> stacks list). Same branch showStackOptions uses -
                // the centered popupTeamSelector sits at a lower z-index than
                // the flyout and lands mid-screen, which reads as a different
                // surface opening behind the one you were working in.
                vm.optStacksOpen = false;
                vm.optStackTeamsOpen = true;
                vm.sizeTeamsFlyoutSoon();
            } else {
                // modal context (lineups dialog): keep the full-table dialog
                vm.showTeamPopupSelector = 1;
            }
        };
        vm.onGlobalTeamStackPctChanged = function () {
            var stk = vm.showCreateStackItem;
            var globalExp = vm.getGlobalTeamStackExp();

            var ts = vm.teamsInSlate;
            for (var i = 0; i < ts.length; i++) {
                var t = ts[i];
                if (t.IsStacking) {
                    stk.teams[t.Id] = t.maxExp = globalExp.toString();
                    t.IsStacking = (globalExp > 0);
                }
            }
            
            vm.updateStackOptionCnt(stk);
        };
        vm.onTeamStackPctChanged = function (team) {
            var stk = vm.showCreateStackItem;
            if (team.maxExp == "0") {
   
                team.IsStacking = false;
            } else {
                team.IsStacking = true;
            }
            stk.teams[team.Id] = team.maxExp;
            vm.updateStackOptionCnt(stk);
        };
        vm.onTeamStackingChanged = function (team) {
            // mode 3: a position rule stores abbreviations and has no
            // per-team exposure, so the whole maxExp path below is skipped.
            if (vm.teamPopupSelectorMode === vm.POS_STACK_TEAM_MODE) {
                vm.syncPosStackTeams();
                return;
            }
            var globalExp = vm.getGlobalTeamStackExp();
            var stk = vm.showCreateStackItem;
            if (team.IsStacking) {
                if (team.maxExp == "0") {
                    team.maxExp = globalExp.toString();
                }
                stk.teams[team.Id] = team.maxExp;
            } else {
                team.maxExp = "0";
                stk.teams[team.Id] = "0";
            }
            vm.updateStackOptionCnt(stk);
        };

        vm.updateStackOptionCnt = function (stk) {
            var cnt = 0;
            for (const [key, value] of Object.entries(stk.teams)) {
                var exp = parseInt(value);
                if ((exp > 0 && exp <= 100)) {
                    cnt++;
                }
            }
            stk.teamsCntStr = (cnt == vm.teamsInSlate.length) ? "ALL" : cnt.toString();
            vm.saveStackOptions();
        };

        vm.checkForInvalidStackState = function () {
            var cnt = 0;
            for (var i = 0; i < vm.stackOptions.length; i++) {
                var stk = vm.stackOptions[i];
                if (stk.enabled  && (cnt + stk.stackSize) <= vm.selectedSlate.LineupRequirements.length) {
                    cnt += stk.stackSize;
                } else {
                    if (stk.enabled) {
                        stk.enabled = false;
                        stk.enabledStr = stk.enabled ? "Enabled" : "Disabled";
                        vm.showtoast('Stack sizes were not valid: a stack was disabled.');
                    }
                }
            }
        };

        vm.updateStackSize = function (stk, size) {
            stk.stackSize = size;
            vm.checkForInvalidStackState();
            vm.saveStackOptions();
        };
        vm.showStackOptions = function (stkOpt) {
            vm.showCreateStackItem = stkOpt;
            if (vm.optStacksOpen) {
                // flyout context: open the options as an in-place pane (back -> stacks list)
                vm.optStacksOpen = false;
                vm.optStackOptionsOpen = true;
            } else {
                // modal context (from the lineups dialog)
                vm.showTeamStacksPopup = 0;
                vm.showStackOptionsDialog = true;
            }
            setTimeout(function () {
                $scope.$broadcast('reCalcViewDimensions');
            }, 100);
        };
        vm.onDeleteStack = function (stk) {
            var idx;
            if ((idx = vm.stackOptions.indexOf(stk)) >= 0) {
                vm.stackOptions.splice(idx, 1);
                vm.saveStackOptions();
            } 
        };
        vm.toggleStackReqPosition = function (pos) {
            var stk = vm.showCreateStackItem;
            if (pos == null) {
                stk.positions = [];
            } else {
                var idx;
                if ((idx = stk.positions.indexOf(pos)) >= 0) {
                    stk.positions.splice(idx, 1);
                } else {
                    stk.positions.push(pos);
                }
            }
        };

        vm.getSportSpecificToolTip = function(col){
            if(vm.getShowSportSpecificCol(col)){
                if(LineStar.Sport == 3){
                    if(col == 0){
                        return 'Batting order';           
					}else if(col == 1){
                        return 'Hitter batting stance / Pitcher throwing arm';           
					}
				}else if(LineStar.Sport == 6){
                    if(col == 0){
                        return 'Even Strength Line';
					}else if(col == 1){
                        return 'PowerPlay line';           
					}
				}
			}
            return '';
		};

        vm.getShowSportSpecificCol = function(col){
            if(col == 0 && (LineStar.Sport == 6 || LineStar.Sport == 3)){
                return true;     
            }else if(col==1 && (LineStar.Sport == 6 || LineStar.Sport == 3)){
                return true;
			}
            return false;
		};
        vm.getSportSpecificColName = function(col){
            if(col == 0){
                if(LineStar.Sport == 6){
                    return "Line";     
			    }else if(LineStar.Sport == 3){
                    return "Order";     
			    }
            }else if(col == 1){
                if(LineStar.Sport == 6){
                    return "PPL";     
			    }else if(LineStar.Sport == 3){
                    return "Bat/Arm";     
			    }
			}
            return "????";
		};
        vm.getSportSpecificColValue = function(p, col){
            if(col == 0){
                if(LineStar.Sport == 6 || LineStar.Sport == 3){
                    return (p.LU < 100) ? p.LU : "-";     
			    }
            }else if(col == 1){
                if(LineStar.Sport == 6){
                    return (p.PPL < 100) ? p.PPL : "-";     
			    }else if(LineStar.Sport == 3){
                    return p.BatThrow;
				}
			}
            return "-";
		};

        vm.onExpandAllPlayersToggled = function(){
            // same as a row chevron: the expander has been used
            vm.markRowExpandLearned();

            for(var sKey in vm.salariesPerSlate){
                var salDict = vm.salariesPerSlate[sKey];
                for(var pKey in salDict){
                    salDict[pKey].IsExpanded = vm.allPlayersExpanded;
                }
		    }
            LineStarUtility.saveSettingInt("allPlayersExpanded", vm.allPlayersExpanded ? 1 : 0);
            vm.chart_debounce();
		};

        vm.onPlayerRowExpanded = function(p){
            vm.chart_debounce();
		};

        /* per-row expand chevron in the pos column (table view). Row clicks
           no longer toggle - this is the only per-player control, mirroring
           the header's expand-all. stopPropagation keeps the click off the
           row's other delegated handlers. */
        vm.toggleRowExpand = function(p, $event){
            if ($event) { $event.stopPropagation(); $event.preventDefault(); }
            if (!p) { return; }
            // they have worked the control - stop opening row one on load
            vm.markRowExpandLearned();
            p.IsExpanded = !p.IsExpanded;
            vm.onPlayerRowExpanded(p);
		};

        vm.onPlayerLockToggled = function(p){
            p.IsLocked=!p.IsLocked;
            vm.onPlayerRowLocked(p);
		};

        vm.onPlayerRowLocked = function(p){
            if(p.IsLocked){
                // Auto-progress only once the user has engaged the builder by tapping
                // an empty slot (activeSlotIdx >= 0). Otherwise just lock the player
                // into the next open spot without advancing or filtering.
                var noProgress = !(vm.lineupBuilder && vm.lineupBuilder.activeSlotIdx >= 0);
                if(!vm.addPlayerToLineupBuilder(p, null, noProgress)){
                    p.IsLocked = false;
			    }
                // (no sheet reopen after a lock: the slot banner above the
                // bottom nav carries the what's-next signal)
            }else{
                vm.removePlayerFromLineupBuilder(p);
			}
		};

        vm.playerExcludeChanged = function (p) {
            if (!p.IsIncluded) {
                if (p.IsLiked) {
                    p.IsLiked = false;
                }
                vm.setMaxExp(p, 0, 0);
                vm.showtoast(p.Name + ' will be excluded from optimized lineups.');
            } else {
                vm.setMaxExp(p, 0, 1);
            }
            vm.onPlayerLikeOrExcludeChanged(p);
		};

        vm.playerLikeToggle = function(p){
            p.IsLiked = !p.IsLiked;
            vm.playerLikeChanged(p);
		}
        
        vm.playerLikeChanged = function(p){
            if(p.IsLiked && !p.IsIncluded){
                p.IsIncluded = true;
			}
            vm.onPlayerLikeOrExcludeChanged(p);
		};

        // like count shown on the rowActionBar's like button: the server's
        // community LoveCount offset by the user's own local like change since
        // load, so it bumps immediately when they (un)like. Doesn't mutate
        // LoveCount, so the periodic server refresh can't clobber it.
        vm.rabLikeCount = function (p) {
            if (!p) { return 0; }
            var lc = parseInt(p.LoveCount, 10); if (isNaN(lc)) { lc = 0; }
            var n = lc + ((p.IsLiked ? 1 : 0) - (p._likeApplied || 0));
            return n < 0 ? 0 : n;
        };

        vm.onUnlikePlayer = function(p){
            p.IsLiked = false;
            vm.onPlayerLikeOrExcludeChanged(p);
        };

        vm.onUnlikeAllPlayers = function(){
            // copy first - onUnlikePlayer mutates the likedPlayers list
            var liked = (vm.likedPlayers || []).slice();
            for (var i = 0; i < liked.length; i++) {
                vm.onUnlikePlayer(liked[i]);
            }
        };

        vm.showOnlyLikedPlayers = false;
        vm.showOnlyExcludedPlayers = false;
        vm.showOnlyProjAdjustedPlayers = false;
        vm.showOnlyExposureAdjustedPlayers = false;
        vm.onFilterAdjustments = function (val) {
            if (val == 0) {
                vm.showOnlyLikedPlayers = !vm.showOnlyLikedPlayers;
            } else if (val == 1) {
                vm.showOnlyExcludedPlayers = !vm.showOnlyExcludedPlayers;
            } else if (val == 2) {
                vm.showOnlyProjAdjustedPlayers = !vm.showOnlyProjAdjustedPlayers;
            } else if (val == 3) {
                vm.showOnlyExposureAdjustedPlayers = !vm.showOnlyExposureAdjustedPlayers;
            }
            vm.filter_debounceShort();
        };

        vm.onPlayerLikeOrExcludeChanged = function(p){
            var idx = vm.likedPlayers.indexOf(p);
            if (p.IsLiked && idx < 0){
                vm.likedPlayers.push(p);
            } else if (!p.IsLiked && idx >= 0){
                vm.likedPlayers.splice(idx, 1);
			}
            vm.count_liked = vm.likedPlayers.length;

            idx = vm.excludedPlayers.indexOf(p);
            if (!p.IsIncluded && idx < 0) {
                vm.excludedPlayers.push(p);
            } else if (p.IsIncluded && idx >= 0) {
                vm.excludedPlayers.splice(idx, 1);
            }
            vm.count_removed = vm.excludedPlayers.length;

            var hasModExp = vm.hasUserModifiedMaxExp(p);
            idx = vm.expAdjustedPlayers.indexOf(p);
            if (hasModExp && idx < 0) {
                vm.expAdjustedPlayers.push(p);
            } else if (!hasModExp && idx >= 0) {
                vm.expAdjustedPlayers.splice(idx, 1);
            }
            vm.count_expAdj = vm.expAdjustedPlayers.length;

            //
            var mod = vm.findOrCreateUserMod(p);
            if(!p.IsIncluded){
                mod.Loved  = 2;     
			}else if(p.IsLiked){
                mod.Loved  = 1;   
			}else{
                mod.Loved  = 0;
            }

            vm.pushUserModToSave(mod);
		};

        vm.filterPlayers = function(){
            return function (player) {
                return vm.isInSlate(player);
            }
		};
        vm.getHasTeams = function(){
            return vm.periodData.HasTeams;
        };
        vm.isTieredSlate= function(){
            var s = vm.selectedSlate;
            return s != null && s.IsTiered;
        };
        vm.isInSlate = function(){
            return true;
        };
        vm.getPlayerGame = function(p){
            return vm.GameDict[p.GID];
        };
        vm.getPlayerGameTime = function(p){
            return (p.Game != null) ? LineStarUtility.parseTime2(p.Game.Time).format("hh:mm tt") : LineStarUtility.parseTime2(p.GT).format("hh:mm tt");
        };
        vm.getPlayerImg = function(p){
            return (p.IMG != null && p.IMG.length > 0 && p.IMG != "0") ? vm.HeadShotImgBase + p.IMG : vm.HeadShotNone;
        };
        vm.hasPlayerTeamImg = function(p, opp){
            var img = vm.getPlayerTeamImg(p, opp);
            return (img != null && img.length > 0);
        };
        vm.getPlayerTeamImg = function(p, opp){
            var gi = p.Game;
            var img = null;
            if(gi != null){
                var id = opp ? p.OTID : p.PTID;
                img = gi.AwayTeamId == id ? gi.AwayTeamImgUrl : gi.HomeTeamImgUrl;
            }
            return img;
        };
        vm.getPlayerTeamImgUrl = function(p, opp){
            var img = vm.getPlayerTeamImg(p, opp);
            return (img != null && img.length > 0) ? vm.TeamImgBase + img : null;
        };
        vm.getPlayerChatCnt = function(p){
            return p.MessageCount ? p.MessageCount : 0;
        };
        vm.isPlayerInBuilder = function (p) {
            var lb = vm.lineupBuilder;
            var ib = false;
            if (lb != null && lb.slots != null) {
                for (var i = 0; i < lb.slots.length; i++) {
                    var slot = lb.slots[i];
                    if (slot != null && slot.salary != null && slot.salary.PID == p.PID) {
                        ib = true;
                        break;
                    }
                }
            }
            return ib;
        };
        vm.getSalaryStr = function(sal){
            return "$" + sal.toLocaleString("en-US");
        };
        vm.getPlayerSalStr = function (p) {

            var salMult = 1;
            var lb = vm.lineupBuilder;
            var sl = vm.selectedSlate;
            if (lb != null && lb.activeSlotIdx >= 0 && sl != null) {
                var slot = sl.LineupRequirements[lb.activeSlotIdx];
                if (slot.SalMult > 1) {
                    salMult = slot.SalMult;
                }
            }

            return (salMult == 1) ? vm.getSalaryStr(p.SAL) : vm.getSalaryStr(p.SAL * salMult) + "*";
        };
        vm.getPlayerValue = function (p) {
            var ss = (vm.selectedSlate != null && vm.selectedSlate.SalaryCap >= 9999);
            var mil = ss ? 1000 : 10;
            var val = (p.UserPP / (p.SAL/mil));
            return val.toFixed(1);
        };
        vm.getPlayerOwnForSlate = function(p, slate){
            var ownSlateProj = vm.periodData.Ownership.ProjectedDict[slate.Id];
            if(ownSlateProj != null){
                var item = ownSlateProj[p.Id];
                if(item != null && item != undefined){
                    return item.Owned;        
				}
            }
            return 0;
        };

        vm.findClosestContestForActualOwnership = function(){
            var contest = null;
            var backupCts = null;
            var cts = vm.periodData.Ownership.ContestResults;

            for(var i=0; i < cts.length; i++){
                var c = cts[i];
                if(c.Contest.SlateId == vm.selectedSlate.Id){
                    if(c.Contest.ContestType == 4){
                        contest = c;
                        break;
                    }
                    backupCts = c;
				}
			}

            if(contest == null){
                contest = backupCts;
			}

            return contest;
		};
        vm.getPlayerActualOwn = function(p, contest){

            if(contest != null){
                for(var i=0; i < contest.OwnershipData.length; i++){
                    var own = contest.OwnershipData[i];  
                    if(own.SalaryId == p.Id){
                        return own.Owned;        
				    }
			    }
            }
            return 0;
        };

        /*vm.getSafetyProj = function(p){
            var own = p.Owned/100;
            var pp = (p.AggProj > 0) ? p.AggProj : p.PP;
            return (own * pp) * 5;
		};*/
        vm.getSafetyProj = function (p) {
            var o = p.Owned;
            var pp = p.PP;
            if (o > 0 && pp > 0) {
                if (o < 2) {
                    o = 2;
                }

                var own = (1 + (o / 100));
                var conf = (p.Conf > 0) ? (1 + (p.Conf / 100)) : 1;
                var cnt = 1;

                if (p.AggProj > 0) {
                    pp += p.AggProj;
                    cnt++;
                }
                pp += p.Floor;
                pp /= cnt;

                return (pp * conf * own);
            }
            return 0;
        };

        vm.getPlayerLeverage = function (p) {
            var o = p.Owned;
            var pp = p.PP;

            if (o > 0 && pp > 0) {
                if (o < 2) {
                    o = 2;
                }

                var a = p.AggProj;
                if (a > 0) {
                    pp += a;
                }
                pp += p.Ceil;

                var sal = (p.SAL >= 1000) ? (p.SAL / 1000) : (p.SAL / 10);
                var lev = (pp / o) * sal;

                return LineStarUtility.round(lev, 1);
            }
            return 0;
        };
        /*vm.getPlayerLeverage = function(p){
            var own = p.Owned;
            var sl = vm.selectedSlate;
            var ss = (sl != null && sl.SalaryCap >= 9999);
            var mil = ss ? 1000 : 10;
            var val = (p.PP / (p.SAL/mil));

            var proj = (p.AggProj > 0) ? p.AggProj : p.PP;
            var vLev = LineStarUtility.round((((val*10) * (100-own))/100), 1);
            var pLev = LineStarUtility.round(((proj * (100-own))/100), 1);

            return vLev + pLev;
            //return LineStarUtility.round(((p.PP * (100-own))/100), 1);
        };*/

        vm.getSalaryFromSlot = function (li) {
            return (li.Salary != null) ? (li.Salary.SAL * li.req.SalMult) : 0;
        };

        vm.getPointsProjectedFromSlot = function (li) {
            var val = (li.Salary != null) ? (li.Salary.UserPP * li.req.PointMultiplier) : 0;
            return LineStarUtility.round(val, 2);
        };
        
        // Combined batting-order + starter-status badge (MLB): ONE square
        // carries both signals - solid fill = confirmed lineup, dashed
        // hollow = projected/expected. Green 1-5 / red 6-9, the same split
        // the static alerts/N.svg squares used. Returns '' outside MLB or
        // without a valid order, so callers can fall back to the old icons.
        vm.getOrderBadge = function (p) {
            if (LineStar.Sport != 3) { return ''; }
            var lu = parseInt(p.LU, 10);
            if (!(lu >= 1 && lu <= 9)) { return ''; }
            var conf = (p.StartingStatus == 2);
            var cls = 'buOrd ' + (lu <= 5 ? 'buOrdG' : 'buOrdR') + (conf ? ' buOrdConf' : ' buOrdExp');
            var suf = (lu == 1) ? 'st' : (lu == 2) ? 'nd' : (lu == 3) ? 'rd' : 'th';
            var tip = 'Batting ' + lu + suf + (conf ? ' — confirmed lineup' : ' — projected lineup');
            return '<span class="' + cls + '" data-toggle="tooltip" title="" data-original-title="' + tip + '">' + lu + '</span>';
        };

        vm.getPlayerStatusIcons = function(p){
            // memo: per-row binding, runs every digest - inputs are the
            // order/starter/injury fields only (sport is fixed per page)
            var siKey = '' + p.LU + '|' + p.StartingStatus + '|' + p.IS;
            if (p._siKey === siKey) { return p._siHtml; }
            var html = '';
            var badge = vm.getOrderBadge(p);
            if (badge) {
                // MLB with a batting order: the badge subsumes the
                // expected/confirmed starter icon
                html = badge;
            } else if(p.StartingStatus > 0){
                if(p.StartingStatus == 1){
                    html = '<span class="playerIconExpectedStarter" data-toggle="tooltip" title="" data-original-title="Player is in our expected starting lineup."></span>';
				}else if(p.StartingStatus == 2){
                     html = '<span class="playerIconConfirmedStarter" data-toggle="tooltip" title="" data-original-title="Player has been confirmed in the starting lineup."></span>';
				}
			}
            if(p.IS > 0){
                var img = vm.injuryImgArr[p.IS];
                html += '<img class="statusAlertIcon" src="/Portals/0/images/alerts/' + img + '.png" height="14" alt="Injury">';
			}
            p._siKey = siKey;
            p._siHtml = html;
            return html;
		};

        /* ---- extra sport-specific stats --------------------------------------
           Surfaces a matchup-data column as BOTH a card stat (left of the alert
           icons) and its own hideable/sortable table column. Add a sport here
           and the column appears everywhere the generic column plumbing reaches
           - hide/show, reorder, highlight, the "N hidden" pill.

           Two things must be added by hand for a new key: the <th>/<td> pick it
           up automatically (they ng-repeat this list), but projections_new.css
           needs .fscHideCol-<key> / .fscSortCol-<key> / .fscHlCol-<key> rules,
           since those are static enumerations.

           mdId is the matchup-data GROUP id (nascar: 'pmatchup' = qualifying,
           'tmatchup' = track) and mdCol is the column name inside it. */
        var SPORT_EXTRA_STATS = {
            // golf (PGA): season stats
            5: [{ key: 'wins', label: 'Wins', shortLabel: 'W', mdId: 'smatchup', mdCol: 'Wins' },
                { key: 'top10s', label: 'Top 10s', shortLabel: 'T10', mdId: 'smatchup', mdCol: 'Top 10s' }],
            // mma (UFC): the bout itself. The full-fight line arrives as American
            // odds (-220 / +180); 'impprob' displays it as a probability, with
            // the raw line kept for the hover tip. Keeps its own name - this is
            // the bout line, separate from the Imp Win% column.
            8: [{ key: 'maxrounds', label: 'Max Rounds', shortLabel: 'RNDS', mdId: 'fight', mdCol: 'Max Rounds' },
                { key: 'fightodds', label: 'Full Fight Odds', shortLabel: 'ODDS', mdId: 'fight', mdCol: 'Full Fight Odds', format: 'impprob' }],
            // nascar: qualifying, plus the same season stats where the feed carries them
            9: [{ key: 'qualpos', label: 'Qualifying Pos', shortLabel: 'QUAL', mdId: 'pmatchup', mdCol: 'Qualifying Pos' },
                { key: 'wins', label: 'Wins', shortLabel: 'W', mdId: 'smatchup', mdCol: 'Wins' },
                { key: 'top10s', label: 'Top 10s', shortLabel: 'T10', mdId: 'smatchup', mdCol: 'Top 10s' }]
        };
        var extraStatCfg = SPORT_EXTRA_STATS[LineStar.Sport] || [];
        /* Narrowed by buildExtraStatIndex to the entries this period actually
           carries - a configured stat whose group or column is missing would
           otherwise render a column of dashes. */
        vm.sportExtraStats = extraStatCfg.slice();
        /* Sports that show the implied column on the card as well as the table.
           Separate from SPORT_EXTRA_STATS because this one is already a player
           field (VegasImplied) with an existing column - nothing to resolve out
           of matchup data. The label follows getImpColHeader, so these two read
           "Imp Win%"; add a sport id here to surface it. */
        var CARD_IMPLIED_SPORTS = { 5: 1, 8: 1, 9: 1 };   // golf (PGA), mma (UFC), nascar
        vm.showImpliedOnCard = !!CARD_IMPLIED_SPORTS[LineStar.Sport];

        /* Resolved once per slate refresh: walking PlayerMatchups per player per
           digest would be O(players x matchups) on every sort and filter. */
        vm._extraStatIdx = {};
        vm.buildExtraStatIndex = function () {
            vm._extraStatIdx = {};
            /* updateSalariesForSlate can run before the period's matchup feed is
               in; the lookups below would throw on it */
            if (!vm.periodData || !vm.periodData.MatchupData) { return; }
            var avail = [];
            for (var i = 0; i < extraStatCfg.length; i++) {
                var s = extraStatCfg[i];
                var md = vm.getMatchupDataColById(s.mdId);
                var idx = vm.getMatchupDataColIdxForName(md, s.mdCol);
                if (md == null || idx < 0) { continue; }   // feed missing for this period
                var bySid = {}, byPid = {};
                for (var j = 0; j < md.PlayerMatchups.length; j++) {
                    var pm = md.PlayerMatchups[j];
                    /* same SID-or-PlayerId fallback the other matchup lookups use */
                    if (pm.SID > 0) { bySid[pm.SID] = pm.Values[idx]; }
                    else { byPid[pm.PlayerId] = pm.Values[idx]; }
                }
                vm._extraStatIdx[s.key] = { md: md, idx: idx, bySid: bySid, byPid: byPid };
                avail.push(s);
            }
            /* Only swap the array when the RESOLVED set changes - ng-repeat
               rebuilds every th/td on a new reference, and this runs on every
               slate refresh. */
            var same = (avail.length === vm.sportExtraStats.length);
            for (var k = 0; same && k < avail.length; k++) { same = (avail[k].key === vm.sportExtraStats[k].key); }
            if (!same) { vm.sportExtraStats = avail; }
        };
        /* American odds -> implied win chance. Straight conversion, so the two
           fighters in a bout sum to more than 100% - that gap is the vig, and
           removing it would need the opponent's line, which isn't in this row. */
        vm.formatImpliedPct = function (raw) {
            var ml = parseFloat(raw);
            if (!isFinite(ml) || ml === 0) { return null; }
            return Math.round(vm.getImpProbability(ml) * 100) + '%';
        };
        vm.applyExtraStats = function (ps) {
            if (!vm.sportExtraStats.length) { return; }
            var out = {}, tips = {};
            for (var i = 0; i < vm.sportExtraStats.length; i++) {
                var s = vm.sportExtraStats[i];
                var ix = vm._extraStatIdx[s.key];
                var v = ix ? (ix.bySid[ps.Id] != null ? ix.bySid[ps.Id] : ix.byPid[ps.PID]) : null;
                if (v != null && v !== '' && s.format === 'impprob') {
                    var pct = vm.formatImpliedPct(v);
                    /* keep the line itself on the tooltip - the number people
                       actually quote is still the American odds */
                    if (pct != null) { tips[s.key] = v; }
                    v = pct;
                }
                out[s.key] = (v == null || v === '') ? '-' : v;
            }
            ps.extraStats = out;
            ps.extraStatsTip = tips;
        };
        /* the header reuses the existing matchup sort path (sortMethod -1 sorts
           by matchupDataSorter + column index), so these columns sort like any
           matchup column picked from the sort menu */
        vm.isExtraStatSorted = function (xs) {
            var ix = vm._extraStatIdx[xs.key];
            return !!(ix && vm.sortMethod == -1 && vm.matchupDataSorter == ix.md && vm.matchupDataSorterColIdx == ix.idx);
        };
        vm.sortByExtraStat = function (xs) {
            var ix = vm._extraStatIdx[xs.key];
            if (!ix) { return; }
            if (vm.isExtraStatSorted(xs)) {
                vm.sortDesc = vm.sortDesc ? 0 : 1;
            } else {
                vm.matchupDataSorter = ix.md;
                vm.matchupDataSorterColIdx = ix.idx;
                vm.sortMethod = -1;
                vm.sortDesc = ix.md.ColumnsSortDir ? ix.md.ColumnsSortDir[ix.idx] : 1;
            }
            if (vm.saveSortMethod) { vm.saveSortMethod(); }
            vm.filter_debounceShort();
        };

        vm.getMatchupDataColById = function(id){
            var md = vm.periodData.MatchupData;
            for(var i=0;i<md.length;i++){
                if (md[i].Id == id) {
                    return md[i];        
				}     
			}
            return null;
        };
        vm.getMatchupDataColIdxForName = function (md, name) {
            if (md != null) {
                for (var i = 0; i < md.Columns.length; i++) {
                    if (md.Columns[i] == name) {
                        return i;
                    }
                }
            }
            return -1;
		};

        vm.getPlayerMatchupDataEleValForPlayerOnTeam = function(id, name, teamId){
            var md = vm.getMatchupDataColById(id);
            if(md != null){
                var idx = vm.getMatchupDataColIdxForName(md, name);
                for(var i=0; i < md.PlayerMatchups.length; i++){
                    var pm = md.PlayerMatchups[i];
                    var ps = vm.SalaryDict[pm.SID];
                    if(ps != null && ps.PTID == teamId){
                        return pm.Values[idx];
				    }
			    }
            }
            return "0";
		};

        vm.getPlayerMatchupDataEleVal = function(p, id, name){
            var split = id.split('/');
            for(var i=0; i < split.length; i++){
                var splitId = split[i];
                var md = vm.getMatchupDataColById(splitId);
                if(md != null){
                    var idx = vm.getMatchupDataColIdxForName(md, name);
                    for(var j=0; j < md.PlayerMatchups.length; j++){
                        var pm = md.PlayerMatchups[j];
                        if((pm.SID > 0 && pm.SID == p.Id) || (pm.SID ==0 && pm.PlayerId == p.PID)){
                            return pm.Values[idx];
				        }
			        }
                }
            }
            return "0";
		};

        vm.getPlayerMatchupDataEleValBySid = function(md, p, idx){
            for(var i=0; i < md.PlayerMatchups.length; i++){
                var pm = md.PlayerMatchups[i];
                if((pm.SID > 0 && pm.SID == p.Id) || (pm.SID ==0 && pm.PlayerId == p.PID)){
                    return parseFloat(pm.Values[idx]);
				}
			}
            return "-";
		};

        vm.getPlayerMatchupDataEle= function(p, id){
            var ret = {'md':null};
            ret.col = vm.getMatchupDataColById(id);
            if(ret.col != null && p != null){
                for(var i=0; i < ret.col.PlayerMatchups.length; i++){
                    var pm = ret.col.PlayerMatchups[i];
                    if((pm.SID > 0 && pm.SID == p.Id) || (pm.SID ==0 && pm.PlayerId == p.PID)){
                        ret.md = pm;
                        break;
				    }
			    }
            }
            return ret;
		};

        vm.calculateWinPct = function(p){
            if(LineStar.Sport == 5 || LineStar.Sport == 9){
                var odds = vm.getPlayerMatchupDataEleVal(p, (LineStar.Sport == 5) ? 'golferInfo' : 'pmatchup', 'Vegas Odds');
                var dec = LineStarUtility.safeParseFloat(odds);
                var ml = 0;
                if(dec > 0){
                    ml = (1/dec);
				}
                return LineStarUtility.round((ml*100), 1);
			}else{
                return vm.calculateTeamWinPct(p.Game, p.PTID);
            }
		};

        vm.calculateTeamWinPct = function(game, tid){
            var ml = (game.AwayTeamId == tid) ? game.VegasMoneyLineAway : game.VegasMoneyLineHome;
            if (ml < 0){
                ml = (ml / (ml - 100));
            }else if (ml > 0){
                ml = 1 - (ml / (ml + 100));
            }else {
                ml = .5;
            }
            return LineStarUtility.round((ml*100), 1);
		};

        vm.getSportPointsName = function(){
            switch(LineStar.Sport){
                case 5:
                case 8:
                case 9:
                case 13:
                case 14:
                    return "Win%";
                case 1:
                case 2:
                case 4:
                case 10:
                case 11:
                case 12:
                    return "Points";
                case 3:
                    return "Runs";
                case 6:
                case 7:
                    return "Goals";
                default:
                    return "Pts";
			}
		};
        vm.sportsPointsName = vm.getSportPointsName();

        vm.getImpColHeader = function(){
            switch(LineStar.Sport){
                case 5:
                case 8:
                case 9:
                case 13:
                case 14:
                    return "Imp Win%";
                case 1:
                case 2:
                case 4:
                case 10:
                case 11:
                case 12:
                    return "Imp Pts";
                case 3:
                    return "Imp Runs";
                case 6:
                case 7:
                    return "Imp Goals";
                default:
                    return "Implied";
			}
        };

        vm.getImpProbability = function (ml) {
            var abs = Math.abs(ml);
            var num = (ml > 0) ? 100 : abs;
            var denom = abs + 100;
            return (num / denom);
        };

        vm.getImpFromMoneyLine = function (gi, awy) {
            var val = 0;
            var totals = gi.VegasOverUnder;
            if (totals > 0) {
                var ipa = vm.getImpProbability(gi.VegasMoneyLineAway);
                var iph = vm.getImpProbability(gi.VegasMoneyLineHome);
                var ipt = (ipa + iph);
                ipa = (ipa / ipt);
                iph = (iph / ipt);

                var bs = (totals / 2);
                var ae = (ipa - .5);
                var he = (iph - .5);
                var ai = bs + (ae * bs);
                var hi = bs + (he * bs);

                val = awy ? ai : hi;
            }
            return LineStarUtility.round(val, 1);
        };

        vm.getImpFromVegLine = function (gi, awy) {
            var val = 0;
            var totals = gi.VegasOverUnder;
            if (totals > 0) {
                var vl = (awy) ? gi.VegasLineAway : gi.VegasLineHome;
                val = LineStarUtility.round((totals / 2) - (vl/2), 1);
            }
            return val;
        };

        vm.getGameImplied = function(gi, awy){
            switch (LineStar.Sport) {
                case 1:
                case 2:
                case 4:
                case 10:
                case 11:
                case 12:
                    return vm.getImpFromVegLine(gi, awy);
                case 3:
                case 6:
                    return vm.getImpFromMoneyLine(gi, awy);
                case 8:
                case 13:
                case 14:
                    return vm.calculateTeamWinPct(gi, awy ? gi.AwayTeamId : gi.HomeTeamId);
                case 5:
                case 9:
                    return 0;
                default:
                    return vm.getImpFromVegLine(gi, awy);
			}
        };

        vm.getVegasTotals = function(p){
            if(vm.periodData.HasTeams){
                var gi = p.Game;
                if(gi != null && gi != undefined){
                    return gi.VegasOverUnder;        
				}
            }
            return 0;
		};

        vm.getPlayerImp = function(p){
            switch(LineStar.Sport){
                case 5:
                case 8:
                case 9:
                case 13:
                case 14:
                    return vm.calculateWinPct(p);  
			}

            if(vm.periodData.HasTeams){
                // Delegate to the same implied-total calc the team selector uses
                // (getGameImplied) so the salData "Implied" column matches the
                // popupTeamSelector. The old inline math diverged on moneyline
                // sports (NHL/soccer): it didn't de-vig and ignored the
                // underdog's moneyline.
                return vm.getGameImplied(p.Game, p.Game.AwayTeamId == p.PTID);
            }else{
                return 0;
			}
        };

        vm.getOppTeamVersusStr= function(p){
            return (p.Game != null && p.Game.AwayTeamId ==p.PTID) ? "@" : "vs ";
        };

        vm.getPlayerOppRank= function(p){
            return LineStarUtility.getRankStr(p.OppRank);
        };
        vm.getPlayerPosClass = function(p){
            return vm.getPositionClass(p.POS);
        };
        vm.getPositionClass = function(pos){
            var pa = pos.split(/[,\/]/);
            //var pp = p.POS.replace(/\//g, '_');
            return "position_" + LineStar.SportName + "_" + pa[0];
        };

        vm.getHaveGamesStarted = function(){
            if(vm.gameDictForSlate == null || Object.keys(vm.gameDictForSlate).length == 0){
                for(var key in vm.SalaryDict){
                    var p = vm.SalaryDict[key];
                    if(p.PS > 0){
                        return true;
				    }
				}
			}else{
                for(var key in vm.gameDictForSlate){
                    var g = vm.gameDictForSlate[key];
                    if(g.Status > 0 && g.Status != 3){
                        return true;
				    }
			    }
            }
            return false;
		};

        vm.getSecondsForGame = function() {
            var s = LineStar.Sport;
            if (s == 1 || s == 10 || s == 11 || s == 6) {
                return 3600;
            } else if (s == 2 || s == 4) {
                return 2880;
            } else if (s == 3) {
                return 27;
            } else if (s == 12) {
                return 2400;
            }
            return 0;
        };

        vm.getPlayerScoringHtml = function(p){
            var tr = 0;
            var game = p.Game;
            var gameSeconds = vm.getSecondsForGame();
            var secsRemain = (game != null && game != undefined) ? game.TimeRemaining : 0;
            var html = '';
            var projLeft = 0;

            if(gameSeconds > 0 && secsRemain > 0){
                var pps = (p.PP / gameSeconds);
                projLeft = (pps * secsRemain);
                var pmr = 'PMR';

                if (LineStar.Sport == 3) {
                    if (secsRemain > 0) {
                        p.minsLeft = Math.floor(secsRemain / 3);
                        p.minsLeft += ((secsRemain % 3) / 10);
                    }
                    pmr = 'PIR';
                } else {
                    p.minsLeft = (secsRemain / 60);
                }

            }

            if ((p.PS + projLeft) >= p.PP) {
                html += '<span class="scoringHot"></span>';
            }else{
                //html += '<span class="scoringCold"></span>';
			}

            return html;
        };

        vm.initMatchupData = function (playerDict) {
            vm.periodData.MatchupDataDict = {};

            var pmd = vm.periodData.MatchupData;
            for (var idx = 0; idx < pmd.length; idx++) {
                var md = pmd[idx];
                vm.periodData.MatchupDataDict[md.Id] = md;
                for (var i = 0; i < md.PlayerMatchups.length; i++) {
                    var pm = md.PlayerMatchups[i];
                    var sals = [];

                    if (pm.SID > 0) {
                        sals.push(vm.SalaryDict[pm.SID]);
                    } else {
                        var psArr = playerDict[pm.PlayerId];
                        if (psArr != null && psArr != undefined) {
                            for (var j = 0; j < psArr.length; j++) {
                                sals.push(psArr[j]);
                            }
                        }
                    }

                    for (var k = 0; k < sals.length; k++) {
                        var sal = sals[k];
                        if (sal == null || sal === undefined) { continue; }

                        for (var j = 0; j < pm.Ranks.length; j++) {
                            sal.MatchupScore += matchupScoreVals[pm.Ranks[j]];
                        }
                        sal.MatchupData[idx] = pm;
                    }
                }
            }
        };

        // Matchup heat palette per rank bucket (0-4), for light & dark themes.
        // Each matchup element's pieces are averaged into ONE block color
        // (replacing the old row of defrag slivers); the dark set keeps the
        // blocks legible on dark rows instead of staying washed-out pastel.
        var MATCHUP_PAL_LIGHT = { 0: [234, 179, 8], 1: [22, 163, 74], 2: [132, 204, 138], 3: [240, 211, 74], 4: [220, 38, 38] };
        var MATCHUP_PAL_DARK = { 0: [250, 204, 21], 1: [34, 197, 94], 2: [110, 231, 183], 3: [253, 224, 71], 4: [248, 113, 113] };
        // colorblind-friendly heat (Okabe-Ito derived): BLUE = good,
        // VERMILLION = bad - distinguishable for deutan/protan/tritan
        // vision. Yellow mid-buckets are colorblind-safe and stay.
        var MATCHUP_PAL_LIGHT_CB = { 0: [234, 179, 8], 1: [0, 114, 178], 2: [86, 180, 233], 3: [240, 211, 74], 4: [213, 94, 0] };
        var MATCHUP_PAL_DARK_CB = { 0: [250, 204, 21], 1: [66, 148, 255], 2: [125, 200, 247], 3: [253, 224, 71], 4: [255, 138, 76] };
        vm.avgMatchupColor = function (ranks, dark) {
            var pal = (vm.colorblindMode == 1)
                ? (dark ? MATCHUP_PAL_DARK_CB : MATCHUP_PAL_LIGHT_CB)
                : (dark ? MATCHUP_PAL_DARK : MATCHUP_PAL_LIGHT);
            var r = 0, g = 0, b = 0, n = 0;
            for (var i = 0; i < ranks.length; i++) {
                var c = pal[ranks[i]];
                if (c) { r += c[0]; g += c[1]; b += c[2]; n++; }
            }
            if (!n) { return { bg: 'transparent', fg: 'inherit' }; }
            r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
            var lum = 0.299 * r + 0.587 * g + 0.114 * b;   // pick a readable label color for this block
            return { bg: 'rgb(' + r + ',' + g + ',' + b + ')', fg: lum > 150 ? 'rgba(0,0,0,.8)' : 'rgba(255,255,255,.96)' };
        };

        // short 2-4 letter labels shown inside each matchup block. Known ids are
        // mapped explicitly; anything else falls back to initials / a short slice
        // of the matchup's Name so every block still gets a label.
        var MATCHUP_LABELS = {
            seasonBatting: 'B150', last20Batting: 'B20', splitsBatting: 'RL150',
            last20HitSplits: 'RL20', batterVsPitcherSplits: 'SP', batterMisc: 'SC',
            batvspitch: 'BvP', oppBullpen: 'PEN',
            pitchSeason: 'P20', pitchLast5: 'P5', pitcherStatCast: 'SC',
            oppTeamSplits: 'OPP150', oppTeamSplits20: 'OPP20', oppTeamBvP: 'BVP',
            pitcherMisc: 'MISC',
            // basketball - starters/reserves + defense vs position
            startersL5: 'OFF5', startersL20: 'OFF20', reservesL5: 'OFF5', reservesL20: 'OFF20',
            defVsStartingG: 'DEF-G', defVsStartingF: 'DEF-F', defVsStartingC: 'DEF-C',
            defOverall: 'D-ALL', defVsReserves: 'D-RES',
            defVsStartingPG: 'DEF-PG', defVsStartingSG: 'DEF-SG', defVsStartingSF: 'DEF-SF',
            defVsStartingPF: 'DEF-PF', gameInfo: 'GAME',
            // football
            qbseason: 'QB-SZN', qblast4: 'QB-L4', flexSeason: 'FX-SZN', flexlast4: 'FX-L4',
            qbOpposing: 'D-QB', qbOpposingL4: 'D-QB4', rbOpposing: 'D-RB', rbOpposingL4: 'D-RB4',
            recOpposing: 'D-WR', recOpposingL4: 'D-WR4', teOpposing: 'D-TE', teOpposingL4: 'D-TE4',
            dstSeason: 'DST', dstLast4: 'DST-4', oppVsDstSeason: 'OFF', oppVsDstLast4: 'OFF-L4',
            kickingSeason: 'KICK-SZN', kickingLast4: 'KICK-L4', wrMatchup: 'WRvCB', redzoneSnaps: 'REDZ',
            // generic recent
            cmatch: 'CUR', last5: 'LAST5', last10: 'LAST10',
            // golf (tmatchup is sport-scoped in MATCHUP_LABELS_BY_SPORT below)
            gcmatchup: 'COURSE', smatchup: 'SZN', mmatchup: 'MONTH',
            golferInfo: 'INFO', strokesGainedSeason: 'SG',
            // hockey
            goalieLast5: 'G-L5', goalieLast10: 'G-L10', goalieSeason: 'G-SZN',
            goalieOppTeam5: 'OPP-L5', goalieOppTeam10: 'OPP-L10',
            skaterLast5: 'S-L5', skaterLast20: 'S-L20', skaterSeason: 'S-SZN',
            oppVsSkaterL5: 'OPP-L5', oppVsSkaterL20: 'OPP-L20',
            // mma
            fight: 'FIGHT', l5FightsOff: 'OFF-L5', l5FightsDef: 'DEF-L5',
            oppL5FightsOff: 'OPP-OFF', oppL5FightsDef: 'OPP-DEF',
            // nascar (tmatchup / pmatchup are sport-scoped in MATCHUP_LABELS_BY_SPORT below)
            dSeason: 'SZN', dLastSeason: 'SZN-LST',
            timatchup: 'INFO', stmatchup: 'TYPE'
        };
        vm.deriveMatchupLabel = function (name) {
            if (!name) { return '?'; }
            var words = String(name).trim().split(/[\s\-_/]+/).filter(function (w) { return w.length; });
            var label = '';
            if (words.length >= 2) {
                for (var i = 0; i < words.length && label.length < 4; i++) { label += words[i].charAt(0); }
            } else if (words.length === 1) {
                label = words[0].substring(0, 4);
            }
            return label.toUpperCase() || '?';
        };
        // some ids mean different things per sport (same id, different label).
        // Sport ids: Golf=5, Nascar=9. Checked before the shared MATCHUP_LABELS map.
        var MATCHUP_LABELS_BY_SPORT = {
            5: { tmatchup: 'TOURN' },                     // golf: tournament
            9: { tmatchup: 'TRACK', pmatchup: 'QUAL' }    // nascar: track / qualifying
        };
        vm.matchupLabel = function (md) {
            if (!md) { return ''; }
            var bySport = MATCHUP_LABELS_BY_SPORT[LineStar.Sport];
            if (bySport && bySport[md.Id]) { return bySport[md.Id]; }
            return MATCHUP_LABELS[md.Id] || vm.deriveMatchupLabel(md.Name);
        };
        vm.getPlayerMatchupDataAll = function (p) {
            var dark = document.documentElement.getAttribute('data-fsc-theme') === 'dark';
            // memo: per-row binding, runs every digest. The player's matchup
            // data is compared by REFERENCE (a slate/period reload replaces
            // it); everything else that shapes the output is global state
            // captured in the key.
            var mdKey = (dark ? 'd' : 'l') + (vm.colorblindMode == 1 ? 'cb' : '') + '|' + (vm.matchupDataSorter ? vm.matchupDataSorter.Id : '') + '|' + vm.matchupDataSorterColIdx + '|' + vm.sortMethod;
            if (p._mdRef === p.MatchupData && p._mdKey === mdKey) { return p._mdHtml; }
            var html = '';
            var pmd = vm.periodData.MatchupData;
            for (var idx = 0; idx < pmd.length; idx++) {
                var md = pmd[idx];
                var item = p.MatchupData[idx];
                if (item != null) {
                    var cls = 'matchupEle matchupEleAvg';
                    var mEl = '';
                    if (vm.matchupDataSorter == md && vm.sortMethod == -1) {
                        cls += ' matchupTableSel';
                        var val = vm.getPlayerMatchupDataEleValBySid(md, p, vm.matchupDataSorterColIdx);
                        mEl = '<span class="matchupSelData">' + val + '</span>';
                    }
                    var col = vm.avgMatchupColor(item.Ranks, dark);
                    var lbl = vm.matchupLabel(md);
                    html += '<div class="' + cls + '" style="background-color:' + col.bg + ';color:' + col.fg + '" data-mid="' + md.Id + '" data-sid="' + item.SID + '"><span class="matchupEleLabel">' + lbl + '</span>' + mEl + '</div>';
                }
            }
            p._mdRef = p.MatchupData;
            p._mdKey = mdKey;
            p._mdHtml = html;
            return html;
        };

        vm.getPlayerMatchupData = function(p, idx){
            var md = (idx >= 0 && idx < vm.periodData.MatchupData.length) ? vm.periodData.MatchupData[idx] : null;
            if(md == null){
                return "";     
			}
            var item = p.MatchupData[idx];
            var html = '';
            if(item != null){
                html = '<div class ="matchupEle" data-mid="' + md.Id + '" data-sid="' + item.SID + '">';
                for(var i=0; i < item.Ranks.length; i++){
                    html += '<span class="defrag' + item.Ranks[i] + '"></span>';
				}
                html += '</div>';
			}

            return html;
        };
        
        vm.findUserMod = function(sal){
            var um = vm.periodData.Mods;
            for (var i = 0; i < um.length; i++) {
                if (um[i].PlayerSalaryId == sal.Id) {
                    if (um[i].PlayerSalaryVariantId == sal.ActiveVariantId ||
                        um[i].PlayerSalaryVariantId == 0) {
                        return um[i];
                    }
                }
            }
            return null;
        };
        vm.findOrCreateUserMod = function(p){
            var mod = vm.findUserMod(p);
            if(mod == null){
                p.userMod = mod = {Id:0,Mode:vm.selectedSlate.Mode,PeriodId:LineStar.PeriodId,PlayerSalaryId:p.Id,PlayerSalaryVariantId:p.ActiveVariantId,Site:p.S,MinExp:0,MaxExp:0,Pool:0,ProjLock:0,Flags:0 };
                vm.periodData.Mods.push(mod);
			}
            return mod;
        };

        vm.pushUserModToSave = function (mod) {
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a premium member for your adjustments to be saved.');
                return;
            }
            if(vm.modsToSave.indexOf(mod) < 0){
                vm.modsToSave.push(mod);
            }
            vm.saveChanges_debounce();
		};

        vm.doesPositionMatch = function(pos, posArray){
            var posArray2 = pos.split(/[,\/]/);
            for(var i=0; i<posArray.length; i++){
                for(var j=0; j<posArray2.length; j++){
                    if(posArray[i] == posArray2[j]){
                        return 1;           
					}
			    }
			}
            return 0;
		};

        vm.getTeamFromSlate = function(tid){
            var ts = vm.teamsInSlate;
            for(var i=0;i<ts.length;i++){
                if(ts[i].Id == tid){
                    return ts[i];        
				}
            }
            return null;
		};

        vm.getSlate = function(slateId){
            var s = vm.salaryContainer.Slates;
            for(var i=0;i<s.length;i++){
                if(s[i].Id == slateId){
                    return s[i];        
				}     
			}
            return null;
		};

        vm.excludedTeamCnt = 0;
        vm.excludedTeamsStr = '0';
        vm.incTeamsStr = '';
        // the same fact in words: "All 24" / "18 of 24". incTeamsStr stays
        // as-is because the lineups dialog still renders the terse form.
        vm.teamsSummaryStr = '';
        vm.onTeamIncludeChanged = function (save, load) {
            if (vm.selectedSlate == null) { return; }
            var exc = '';
            var cnt = 0;
            var inc = 0;
            var key = "excludedteams_" + vm.Sport + "_" + vm.Site;
            var pid = vm.salaryContainer.Period.Id;
            var obj = { period: pid, slate: vm.selectedSlate.Id, excluded: [] };

            if (load) {
                var str = localStorage.getItem(key);
                if (str != null && str.length > 0) {
                    obj = JSON.parse(str);
                    if (obj != null && (obj.period != pid || obj.slate != vm.selectedSlate.Id)) {
                        obj = null;
                    }
                }
            }

            for(var i=0; i < vm.teamsInSlateForStack.length;i++){
                var t = vm.teamsInSlateForStack[i];
                if (t.Id > 0) { inc++; }

                if (t.Id >= 0 && load && obj != null) {
                    if (obj.excluded.indexOf(t.Id) >= 0) {
                        t.Included = false;
                    }
                }

                if(!t.Included && t.Id >= 0){
                    if(cnt++ > 0){
                        exc += ', ';
					}
                    exc += t.Name;

                    if (save) {
                        obj.excluded.push(t.Id);
                    }
                }
            }

            if (cnt > 0) {
                var tot = inc - cnt;
                vm.incTeamsStr = tot + '/' + inc;
                vm.teamsSummaryStr = tot + ' of ' + inc;
            } else {
                vm.incTeamsStr = inc.toString();
                vm.teamsSummaryStr = 'All ' + inc;
            }

            vm.excludedTeamsStr = (exc.length > 0) ? exc : "0";
            vm.excludedTeamCnt = cnt;

            if (save) {
                var json = JSON.stringify(obj);
                localStorage.setItem(key, json);
            }
        };

        vm.getTeamCircleStyleForPlayer = function (ps, forPlayerTeam) {
            var game = ps.Game;
            var isAway = forPlayerTeam ? (ps.PTID != ps.HTID) : (ps.PTID == ps.HTID);
            if (game != null) {
                var prim = isAway ? game.AwayTeamColorMain : game.HomeTeamColorMain;
                var sec = isAway ? game.AwayTeamColorSecondary : game.HomeTeamColorSecondary;
                return "background-color:" + prim + ";border:2px solid " + sec;
            }
            return "background-color:#000;";
        };

        // Team-colour disc for a team with NO logo, so the team selector matches
        // what the game bar's gameBox already does.
        //
        // Reads AwayTeamColorMain/Secondary off the team's Game - this page's
        // GameDict shape. Deliberately not layout.js's getTeamCircleStyle: that
        // one reads ATMC/HTMC as INTEGERS and runs them through intToHex,
        // because the game bar builds its own game objects. Same idea, different
        // payload; borrowing it would produce "background-color:undefined".
        vm.getTeamCircleStyleForTeam = function (team) {
            var g = (team != null) ? team.Game : null;
            var prim = null, sec = null;

            if (g != null) {
                prim = team.isHome ? g.HomeTeamColorMain : g.AwayTeamColorMain;
                sec = team.isHome ? g.HomeTeamColorSecondary : g.AwayTeamColorSecondary;
            }

            // a team with no colours on file gets a neutral disc rather than an
            // invisible one - "background-color:null" just paints nothing
            if (!prim) { return 'background-color:var(--fsc-text-faint);'; }

            return 'background-color:' + prim + (sec ? ';border:2px solid ' + sec : '');
        };


        vm.onSlateChanged = function(){
            // groups key off salary ids, which are per-slate - reload for the new one
            vm.loadPlayerGroups();
            // rules name lineup positions, which are per-slate too
            vm.migratePositionStackKey();

            vm.loadPositionStacks();
            // projection sets are per sport+site but SELECTED per slate: the
            // saved source falls back to LineStar when it holds nothing here
            vm.loadProjSets();
            // server projections are a first-class source again ("My Projections"),
            // so they are read in place rather than copied into a local set
            vm.mineProjMap = null;
            vm.retireMigratedProjSet();
            vm.loadProjSource();
            // the optimizer keeps its own source; first run inherits the view
            vm.loadOptiProjSource();
            // setups are per sport+site; reloaded here because a site switch
            // comes through the same path
            vm.loadOptiConfigs();
            vm.salaryListForSelSlateALL = [];
            vm.salaryListForSelSlatePosProj = [];
            vm.teamsInSlate = [];
            vm.gameDictForSlate = {};
            vm.teamsInSlateForStack = [];
            vm.excludedTeamsStr = '0';

            vm.clearFilters();

            vm.periodData.PositionFilters = [];

            var ss = vm.selectedSlate;
            var reqs = (ss != null) ? ss.LineupRequirements : [];

            if (ss != null && ss.IsTiered){
                for(var i=0; i < reqs.length; i++){
                    vm.periodData.PositionFilters.push({ 'PositionName': reqs[i].PositionName, 'FilterText': reqs[i].Positions });
				}

			}else{
                var pfs = vm.periodData.PositionFiltersBackup;
                for (var i = 0; i < pfs.length; i++){
                    var added = 0;
                    if (vm.Sport == 1 && pfs[i].FilterText == "FLEX") {
                        for (var j = 0; j < reqs.length; j++) {
                            if (reqs[j].PositionName == 'FLEX') {
                                vm.periodData.PositionFilters.push({ 'PositionName': reqs[j].Positions, 'FilterText': reqs[j].PositionName });
                                added = 1;
                                break;
                            }
                        }
                    }
                    if (!added) {
                        vm.periodData.PositionFilters.push(pfs[i]);
                    }
				}
			}

            // Position stacks are keyed per sport+site now, so the set just
            // loaded may describe a different slate shape than this one.
            // PositionFilters is complete by here - that is what slatePositions
            // is built from, and what the rules are checked against.
            vm.validatePositionStacksForSlate();

            var sg = (ss != null) ? ss.SlateGames : null;
            if(sg != null && sg != undefined){
                for(var i=0; i<sg.length;i++){
                    var gid = sg[i].GameId;
                    if(gid in vm.GameDict){
                        var g = vm.GameDict[gid];
                        vm.gameDictForSlate[gid] = g;

                        g.VegasLineAbs = Math.abs(g.VegasLineHome);

                        var url = (g.AwayTeamImgUrl != null) ? vm.TeamImgBase+g.AwayTeamImgUrl : null;
                        var at = {Id:g.AwayTeamId, otid:g.HomeTeamId, Game:g, isHome:false, Name:g.AwayTeam, opp:'@' +g.HomeTeam, Included:true, ImgUrl:url, Implied:vm.getGameImplied(g, 1), IsDisplayed:false,VegasOverUnder:g.VegasOverUnder, VegasLine:g.VegasLineAway, infoCategories: {}};

                        url = (g.HomeTeamImgUrl != null) ? vm.TeamImgBase+g.HomeTeamImgUrl : null;
                        var ht = {Id:g.HomeTeamId, otid:g.AwayTeamId, Game:g, isHome:true, Name:g.HomeTeam, opp:'vs. ' +g.AwayTeam, Included:true, ImgUrl:url, Implied:vm.getGameImplied(g, 0), IsDisplayed:false,VegasOverUnder:g.VegasOverUnder, VegasLine:g.VegasLineHome, infoCategories: {}};
                       
                        if(vm.Sport == 3){
                            at.VegasLine = g.VegasMoneyLineAway;
                            ht.VegasLine = g.VegasMoneyLineHome;
			            }
                       
                        vm.teamsInSlate.push(at);
                        vm.teamsInSlate.push(ht);
                    }
			    }
            }

            vm.teamsInSlate.sort(function (a, b) {
                  return (a.Name < b.Name) ? -1 : (a.Name > b.Name) ? 1 : 0;
            });

            vm.teamsInSlateForStack = vm.teamsInSlate.slice();
            vm.teamsInSlateForStack.sort(function (a, b) {
                  return (a.Implied < b.Implied) ? 1 : (a.Implied > b.Implied) ? -1 : 0;
            });
            vm.onTeamIncludeChanged(0, 1);
            vm.teamsInSlateForStack.splice(0, 0, {Id:-1, Name:"No Team", ImgUrl:null, Implied:0});

            //
            //var col0 = vm.dynamic.dataCol0;
            //var pmd0 = (col0 != null && col0.vis) ? vm.getMatchupDataColById(col0.id) : null;
             
            vm.contestOwnershipForSlate = vm.findClosestContestForActualOwnership();
            vm.showActualOwnership = (vm.contestOwnershipForSlate != null); 

            var minSal = 99999999;
            var maxSal = 0;
            var minProj = 1000;
            var maxProj = 0;
            var maxOwn = 0;
            var salStep = 100;
            var maxOwn = 0;
            var statsByPos = {};
            vm.initLineGenSettings(0);
            var optSettings = vm.getOptiSettingsObj();
            /* resolve the matchup group + column once for the whole pass */
            vm.buildExtraStatIndex();
            /* saved lineup columns can only be rehydrated once MatchupData is in
               - they carry a group id whose Name is read for the header tooltip.
               Idempotent, so running it per refresh is fine. */
            vm.luLoadCustomCols();

            //
            var dictForSlate = (ss != null) ? vm.salariesPerSlate[ss.Id] : {};
            for (var key in dictForSlate) {
                
                var ps = dictForSlate[key];
                if (ps == null || ps == undefined) { continue;}
        
                ps.SalStr = vm.getPlayerSalStr(ps);
                vm.applyExtraStats(ps);
                ps.colorized = {};
                ps.PosClass = vm.getPlayerPosClass(ps);
                ps.VAL = vm.getPlayerValue(ps);
                ps.ValueX = ps.VAL + "X";
                ps.Leverage = LineStarUtility.safeFixed(vm.getPlayerLeverage(ps));
                ps.Safety = LineStarUtility.safeFixed(vm.getSafetyProj(ps));
                ps.SlateOwnership = LineStarUtility.safeFixed(ps.Owned);

                if(vm.contestOwnershipForSlate != null){
                    ps.ActSlateOwnership = LineStarUtility.safeFixed(vm.getPlayerActualOwn(ps, vm.contestOwnershipForSlate));
				}

                //NOTE: Should be dynamicly updated when game odds change (ugh..recolor)
                ps.VegasImplied = vm.getPlayerImp(ps).toFixed(1);
                ps.vegasTotals = vm.getVegasTotals(ps).toFixed(1);
                ps.CeilStr = ps.Ceil.toFixed(1);
                ps.FloorStr = ps.Floor.toFixed(1);
                ps.ConfStr = ps.Conf.toFixed();
               
                //customizable data
                //ps.dataCol0 = (pmd0 != null) ? vm.getPlayerMatchupDataEleValBySid(pmd0, ps, col0.idx) : 0;

                var um = vm.findUserMod(ps);
                vm.updateSalaryWithMod(ps, um, optSettings);
                
                if(ps.SAL < minSal){
                    minSal = ps.SAL;           
				}
                if(ps.SAL > maxSal){
                    maxSal = ps.SAL;           
				}

                minProj = Math.min(ps.PP, minProj);
                maxProj = Math.max(ps.PP, maxProj);

                if (typeof ps.Owned === 'number') {
                    maxOwn = Math.max(ps.Owned, maxOwn);
                }

                var posArr = (ps.POS != null) ? ps.POS.split(/[,\/]/) : [];
                for (var i = 0; i < posArr.length; i++) {
                    var pos = posArr[i];
                    var stats = statsByPos[pos];
                    if (stats == null || stats == undefined) {
                        stats = statsByPos[pos] = { minProj: 1000, maxProj: 0, minSal: 100000, maxSal: 0 };
                    }
                    if (ps.PP > 0) {
                        stats.maxSal = Math.max(ps.SAL, stats.maxSal);
                        stats.minSal = Math.min(ps.SAL, stats.minSal);
                        stats.minProj = Math.min(ps.PP, stats.minProj);
                        stats.maxProj = Math.max(ps.PP, stats.maxProj);
                    }
                }

                vm.salaryListForSelSlateALL.push(ps);
                if(ps.PP > 0){
                    vm.salaryListForSelSlatePosProj.push(ps);
				} 
            }

            for (var key in statsByPos) {
                var st = statsByPos[key];
                st.salDiff = st.maxSal - st.minSal;
            }

            if (vm.selectedSlate != null) {
                vm.selectedSlate.stats = { minSal: minSal, maxSal: maxSal, minProj: minProj, maxProj: maxProj, minOwn: 0, maxOwn: maxOwn, byPos: statsByPos };
            }
            vm.slate_minSal = minSal;
            vm.slate_maxSal = maxSal;
            vm.slate_salStep = (maxSal >= 1000) ? 100 : (maxSal >= 100) ? 10 : 1;
            vm.filter_maxSalary = maxSal;
            vm.filter_minSalary = minSal;

            vm.updateSalarySlider();
            vm.initTeamInfoElements();
            vm.updateDynamicInfo();
            vm.initLineGenSettings(0);
            vm.initColorizeData();
            vm.updateSalariesForSlate();
            vm.loadLineupRequirementCache();
            vm.loadStackOptions();
            vm.onHandleLineupBuilderAfterSlateChange();
            vm.updateLineupSetCounts();
        };

        vm.getPlayersOnTeamWithNotPosition = function (teamId, notPos) {
            var items = [];
            var sals = vm.salaryListForSelSlatePosProj;
            for (var i = 0; i < sals.length; i++) {
                if (sals[i].PTID == teamId && sals[i].PP > 0 && sals[i].POS.indexOf(notPos) < 0) {
                    items.push(sals[i]);
                }
            }
            return items;
        };
        vm.getPlayerOnTeamWithPosition = function(teamId, withPos){
            var sals = vm.salaryListForSelSlatePosProj;
            for(var i=0; i<sals.length; i++){
                if(sals[i].PTID == teamId && sals[i].PP > 0 && sals[i].POS.indexOf(withPos) >= 0){
                    return sals[i];     
			    }  
		    }
            return null;
	    };

        vm.flatTeamCategoriesIEs = [];
        vm.flatTeamCategories = [];
        vm.initTeamInfoElements = function(){
        
            for(var i=0; i < vm.teamsInSlate.length; i++){
                var team = vm.teamsInSlate[i];
                vm.initTeamInfoElementsForTeam(team);
			}

            vm.flatTeamCategories = [];
            vm.flatTeamCategoriesIEs = [];
            if(vm.teamsInSlate.length > 0){
                var team = vm.teamsInSlate[0];
                for(var key in team.infoCategories){
                    var cat = team.infoCategories[key];
                    vm.flatTeamCategories.push(cat);
                    for(var i=0;i<cat.infoElements.length; i++){
                        cat.infoElements[i].catStart = (i==0);
                        cat.infoElements[i].catEnd = (i==(cat.infoElements.length-1));
                        vm.flatTeamCategoriesIEs.push(cat.infoElements[i]);        
				    }
			    }
            }

            vm.colorizeTeamData();
		};

        vm.initTeamInfoElementsForTeam = function(team){
            var i;
            var cat = {'Key':'Game Factors', infoElements:[]};
            team.infoCategories[cat.Key] = cat;

            cat.infoElements.push({Name:'Opponent', Value: team.opp, c:1, string:1},{Name:'Imp ' + vm.sportsPointsName, Value: team.Implied});

            if(vm.Sport != 13 && vm.Sport != 14 && vm.Sport != 8){
                cat.infoElements.push({Name:'Totals', Value: team.VegasOverUnder});
			}

            if(vm.Sport == 1 || vm.Sport == 10 || vm.Sport == 11){

                team.wideout = vm.findOppPlayerForTeam(team.otid, team.Game.GameId, 'WR');
                team.runningback = vm.findOppPlayerForTeam(team.otid, team.Game.GameId, 'RB');
                team.quarterback = vm.findOppPlayerForTeam(team.otid, team.Game.GameId, 'QB');
                team.oppDefense = vm.findOppPlayerForTeam(team.Id, team.Game.GameId, 'D');

                if(team.oppDefense  != null){
                    var mid = vm.getPlayerMatchupDataEle(team.oppDefense, 'dstSeason');
                    var idx = vm.getMatchupDataColIdxForName(mid.col, 'PtsAllowed/G');
                    cat.infoElements.push({Name:'DST PtsAllowed/G', Value: (mid.md != null) ? mid.md.Values[idx]: '-'});
                }

                cat = {'Key': 'QB vs DST Season', infoElements:[]};
                team.infoCategories[cat.Key] = cat;
                mid = vm.getPlayerMatchupDataEle(team.quarterback, 'qbOpposing');
                items = ['Pass Yards/G', 'Opp Rank', 'FPPG Allowed']; 
                var itemNames = ['Pass YPG', 'QB Rank', 'QB FPPGA']; 
                for(i=0; i < items.length; i++){
                    var idx = vm.getMatchupDataColIdxForName(mid.col, items[i]);
                    cat.infoElements.push({Name:itemNames[i], Value: (mid.md != null) ? mid.md.Values[idx]: '-'});
                }

                cat = {'Key': 'RB vs DST Season', infoElements:[]};
                team.infoCategories[cat.Key] = cat;
                mid = vm.getPlayerMatchupDataEle(team.runningback, 'rbOpposing');
                items = ['Rush Yards/G', 'Opp Rank', 'FPPG Allowed']; 
                itemNames = ['Rush YPG', 'RB Rank', 'RB FPPGA']; 
                for(i=0; i < items.length; i++){
                    var idx = vm.getMatchupDataColIdxForName(mid.col, items[i]);
                    cat.infoElements.push({Name:itemNames[i], Value: (mid.md != null) ? mid.md.Values[idx]: '-'});
                }

                cat = {'Key': 'WR vs DST Season', infoElements:[]};
                team.infoCategories[cat.Key] = cat;
                mid = vm.getPlayerMatchupDataEle(team.wideout, 'recOpposing');
                items = ['Rec Yards/G', 'Opp Rank', 'FPPG Allowed'];
                itemNames = ['Rec YPG', 'WR Rank', 'WR FPPGA']; 
                for(i=0; i < items.length; i++){
                    var idx = vm.getMatchupDataColIdxForName(mid.col, items[i]);
                    cat.infoElements.push({Name:itemNames[i], Value: (mid.md != null) ? mid.md.Values[idx]: '-'});
                }
			}
            else if(vm.Sport == 3){
                var offPlayers = vm.getPlayersOnTeamWithNotPosition(team.Id, 'P');
                var offPlayer = vm.getPlayerOnTeamWithPosition(team.Id, 'OF');
                var mid = vm.getPlayerMatchupDataEle(offPlayer, 'batterMisc');
                var items = ['Ballpark', 'Weather', 'Umpire']; 
                for(i=0; i < items.length; i++){
                    var idx = vm.getMatchupDataColIdxForName(mid.col, items[i]);
                    var val = (mid.md != null) ? mid.md.Values[idx] : '-';

                    if (i == 1 && offPlayers.length > 1) {
                        var avg = 0;
                        var cnt = 0;
                        for (var j = 0; j < offPlayers.length; j++) {
                            var mid2 = vm.getPlayerMatchupDataEle(offPlayers[j], 'batterMisc');
                            var val2 = (mid2.md != null) ? mid2.md.Values[idx] : '0';
                            avg += parseInt(val2);
                            cnt++;
                        }
                        if (cnt > 0 && !isNaN(avg)) {
                            val = LineStarUtility.round(avg / cnt, 1).toString();
                        }
                    }

                    cat.infoElements.push({ Name: items[i], Value: val});
                }

                team.oppPitcher = vm.findOppPlayerForTeam(team.Id, team.Game.GameId, 'P');

                cat = {'Key':'vs. Pitcher (Last 20)', infoElements:[]};
                team.infoCategories[cat.Key] = cat;
                cat.infoElements.push({Name:'vs Pitcher', Value: (team.oppPitcher != null) ? team.oppPitcher.Name : '-', c:1, sizelock:1, string:1});

                mid = vm.getPlayerMatchupDataEle(team.oppPitcher, 'pitchSeason');
                var items = ['ERA', 'WHIP', 'FIP']; 
                for(i=0; i < items.length; i++){
                    var idx = vm.getMatchupDataColIdxForName(mid.col, items[i]);
                    cat.infoElements.push({Name:items[i], Value: (mid.md != null) ? mid.md.Values[idx]: '-'});
                }
            
                cat = {'Key':'vs. Pitcher (Last 5)', infoElements:[]};
                team.infoCategories[cat.Key] = cat;
                mid = vm.getPlayerMatchupDataEle(team.oppPitcher, 'pitchLast5');
                var items = ['ERA', 'WHIP', 'FIP']; 
                for(i=0; i < items.length; i++){
                    var idx = vm.getMatchupDataColIdxForName(mid.col, items[i]);
                    cat.infoElements.push({Name:items[i], Value: (mid.md != null) ? mid.md.Values[idx]: '-'});
                }

                cat = {'Key':'vs. Pitcher Statcast', infoElements:[]};
                team.infoCategories[cat.Key] = cat;
                mid = vm.getPlayerMatchupDataEle(team.oppPitcher, 'pitcherStatCast');
                var items = ['HardContact', 'Avg Exit Vel']; 
                for(i=0; i < items.length; i++){
                    var idx = vm.getMatchupDataColIdxForName(mid.col, items[i]);
                    cat.infoElements.push({Name:items[i], Value: (mid.md != null) ? mid.md.Values[idx]: '-'});
                }

                cat = { 'Key': 'vs. Bullpen', infoElements: [] };
                team.infoCategories[cat.Key] = cat;
                mid = vm.getPlayerMatchupDataEle(offPlayer, 'oppBullpen');
                var items = ['ERA', 'WHIP'];
                for (i = 0; i < items.length; i++) {
                    var idx = vm.getMatchupDataColIdxForName(mid.col, items[i]);
                    cat.infoElements.push({ Name: items[i], Value: (mid.md != null) ? mid.md.Values[idx] : '-' });
                }

                cat = {'Key':'Team Splits (L20 Games)', infoElements:[]};
                team.infoCategories[cat.Key] = cat;
                mid = vm.getPlayerMatchupDataEle(team.oppPitcher, 'oppTeamSplits20');
                items = ['AVG', 'wOBA', 'ISO', 'FP/PA']; 
                for(i=0; i < items.length; i++){
                    var idx = vm.getMatchupDataColIdxForName(mid.col, items[i]);
                    cat.infoElements.push({Name:items[i], Value: (mid.md !=null) ? mid.md.Values[idx] : '-'});
                }
            }else if(vm.Sport == 6){
                team.oppGoalie = vm.findOppPlayerForTeam(team.Id, team.Game.GameId, 'G');     

                cat = {'Key':'Opp Team vs Goalie (Last 5)', infoElements:[]};
                team.infoCategories[cat.Key] = cat;
                cat.infoElements.push({Name:'Goalie', Value: (team.oppGoalie != null) ? team.oppGoalie.Name : '-', c:1, sizelock:1, string:1});

                var mid = vm.getPlayerMatchupDataEle(team.oppGoalie, 'goalieOppTeam5');
                var items = ['Saves/G', 'Shots/G', 'Goals/G']; 
                for(i=0; i < items.length; i++){
                    var idx = vm.getMatchupDataColIdxForName(mid.col, items[i]);
                    cat.infoElements.push({Name:items[i], Value: (mid.md != null) ? mid.md.Values[idx]: '-'});
                }
			}else if(vm.Sport == 2 || vm.Sport == 4 || vm.Sport == 12){
       
                var offPlayer = vm.getPlayerOnTeamWithPosition(team.Id, 'G');

                if(vm.Sport == 2){
                    var pace = vm.getPlayerMatchupDataEleValForPlayerOnTeam('gameInfo', 'Team Pace', team.Id);
                    var oppPace = vm.getPlayerMatchupDataEleValForPlayerOnTeam('gameInfo', 'Opp Pace', team.Id);
                    var totPace = parseFloat(pace) + parseFloat(oppPace);

                    cat.infoElements.push({Name:'Team Pace', Value: pace});
                    cat.infoElements.push({Name:'Combined Pace', Value: totPace.toFixed(1)});
                }

                //
                cat = {'Key':'Team DEF (Last 20)', infoElements:[]};
                team.infoCategories[cat.Key] = cat;

                var mid = vm.getPlayerMatchupDataEle(offPlayer, 'defOverall');
                var items = ['PTS/G', 'REB/G', 'Overall Rank']; 
                var itemNames = ['PTS/G', 'REB/G', 'DEF Rank'];
                for(i=0; i < items.length; i++){
                    var idx = vm.getMatchupDataColIdxForName(mid.col, items[i]);
                    cat.infoElements.push({Name:itemNames[i], Value: (mid.md != null) ? mid.md.Values[idx]: '-'});
                }

                var rankPoss = ['G', 'F', 'C', 'Reserves'];

                if(vm.Sport == 2){
                    rankPoss = ['PG', 'SG', 'SF', 'PF', 'C', 'Reserves'];
				}

                for(var i=0; i < rankPoss.length; i++){
                    var start = (i == rankPoss.length-1) ? 'defVs' : 'defVsStarting';
                    var pos = rankPoss[i];
                    var val = vm.getPlayerMatchupDataEleValForPlayerOnTeam(start + pos, 'Overall Rank', team.Id);
                    cat.infoElements.push({Name:'Rank vs ' + pos, Value: (val != null) ? val : '-'});
                }
			}else if(vm.Sport == 13 || vm.Sport == 14){
                cat = {'Key':'Team (Last 5)', infoElements:[]};
                team.infoCategories[cat.Key] = cat;

                var offPlayer = vm.getPlayerOnTeamWithPosition(team.Id, 'P');
                var mid = vm.getPlayerMatchupDataEle(offPlayer, 'last5');
                var items = ['MatchPlay%', 'Game Win%']; 
                var itemNames = ['MatchPlay%', 'Game Win%'];
                for(i=0; i < items.length; i++){
                    var idx = vm.getMatchupDataColIdxForName(mid.col, items[i]);
                    cat.infoElements.push({Name:itemNames[i], Value: (mid.md != null) ? mid.md.Values[idx]: '-'});
                }

                cat = {'Key':'Team (Last 10)', infoElements:[]};
                team.infoCategories[cat.Key] = cat;
                mid = vm.getPlayerMatchupDataEle(offPlayer, 'last10');
                items = ['MatchPlay%', 'Game Win%']; 
                itemNames = ['MatchPlay%', 'Game Win%'];
                for(i=0; i < items.length; i++){
                    var idx = vm.getMatchupDataColIdxForName(mid.col, items[i]);
                    cat.infoElements.push({Name:itemNames[i], Value: (mid.md != null) ? mid.md.Values[idx]: '-'});
                }
            }

            team.flatInfoElements = [];
            for(var key in team.infoCategories){
                var cat = team.infoCategories[key];
                for(var i=0;i<cat.infoElements.length; i++){
                    var  ie=cat.infoElements[i];
                    ie.catStart = (i==0);
                    ie.catEnd = (i==(cat.infoElements.length-1));
                    team.flatInfoElements.push(ie);        
				}
			}
	    };

        vm.colorizeTeamData = function(){
            var catDict = {};

            for(var i=0; i < vm.teamsInSlate.length; i++){
                var team = vm.teamsInSlate[i];
                for(var catK in team.infoCategories){
                    var cat = team.infoCategories[catK];

                    for(var j=0;j<cat.infoElements.length; j++){
                        var ie = cat.infoElements[j];
                        ie.idx = j;
                        ie.team = team;
                        ie.key = catK + ie.Name;
                        if (catDict[ie.key] == undefined){
                            catDict[ie.key] = {'elements':[],'colorize':(ie.c!=1),'string':(ie.string==1)};
                        }
                        catDict[ie.key].elements.push(ie);
				    }
			    }  
		    }

            for(var k in catDict){
                var arr = catDict[k];
                var eles = arr.elements;
                var colorEles = [];

                for(var i=0; i < eles.length;i++){
                    eles[i].sortValue = vm.getInfoElementNumValue(eles[i]);
				}

                eles.sort(function (a, b) {
                    if(arr.string){
                        return (a.Value < b.Value) ? -1 : (a.Value > b.Value) ? 1 : 0;
					}
                    return b.sortValue - a.sortValue;
                });

                for(var i=0; i < eles.length;i++){
                    if(eles[i].Value != '-'){
                        colorEles.push(eles[i]);           
					}
				}

                if(vm.teamSortKey == k){
                    var sorted = [];
                    for(var i=0; i < eles.length;i++){
                        sorted.push(eles[i].team);
				    }
                    
                    vm.teamsInSlate.sort(function (a, b) {
                        var aVal = sorted.indexOf(a);
                        var bVal = sorted.indexOf(b);
                        return (vm.teamSortDesc == 1) ? aVal - bVal : bVal - aVal;
                    });
			    }

                if(arr.colorize && colorEles.length > 2){
                    var idx = Math.round(colorEles.length*.2);
                    var green = vm.getInfoElementNumValue(colorEles[idx]);
                    idx = (idx <= 0) ? 1 : idx;
                    var red = vm.getInfoElementNumValue(colorEles[colorEles.length-idx]);

                    for(var i=0; i < colorEles.length; i++){
                        var ie = colorEles[i];
                        var val = vm.getInfoElementNumValue(ie);

                        if(val >= green){
                            ie.color = 1;
				        }else if(val <= red){
                            ie.color = 2;
				        }
		            }
                }
		    }
	    };

        vm.getInfoElementNumValue = function(ie){
            var val = (ie.Value == '-') ? 0 : ie.Value;
            return parseFloat(val);
	    };

        vm.updateSalaryWithMod = function (ps, mod, optSettings) {
            ps.userMod = mod;
            ps.IsLiked = (mod != null && mod.Loved == 1);
            ps._likeApplied = ps.IsLiked ? 1 : 0;   // baseline already in LoveCount; user toggles offset from here
            ps.Adjustment = (mod != null) ? mod.Adjustment : 0;
            ps.IsIncluded = (mod == null || mod.Loved != 2);
            ps.MaxExp = vm.getMaxExp(ps, optSettings);

            // The projection now comes from the active LOCAL set, not from the
            // server mod. Love/hate/exclude and max exposure above still come
            // from the mod - only the number moved.
            //
            // Reading mod.ProjLock here as a fallback would be wrong, not just
            // redundant: a user on the LineStar source expects to SEE LineStar,
            // and an old server override would quietly contradict the picker.
            // The migration lifts those into a set once, and after that the
            // server copy is history.
            var setProj = vm.getSetProjection(ps.Id);

            if (vm.projSource === 'consensus') {
                // Consensus is a SOURCE, not an edit - nothing here is "adjusted",
                // so ProjLocked stays 0 and the adjusted filter/badge ignore it.
                // A player with no consensus reads 0, which is honest: that is
                // exactly what the optimizer would see, and the whole option is
                // hidden on slates with no consensus feed at all.
                ps.UserPP = LineStarUtility.ensureNumeric(ps.AggProj);
                ps.ProjLocked = 0;
                ps.Adjustment = 0;
            } else if (setProj != null && isFinite(setProj)) {
                ps.UserPP = setProj;
                ps.ProjLocked = 1;

                var diff = ps.UserPP - ps.PP;
                ps.Adjustment = (ps.PP > 0) ? Math.round((diff / ps.PP) * 100) : 0;
			} else {
                ps.ProjLocked = 0;
                ps.Adjustment = 0;
                ps.UserPP = ps.PP;
			}
            ps.VAL = vm.getPlayerValue(ps);
            ps.ValueX = ps.VAL + "X";
		};

        // ══ Projection sets ═══════════════════════════════════════════════════
        // Named collections of per-player projections, stored in the BROWSER
        // rather than on the server. A set is created by importing a file or by
        // hand-adjusting projections; either way the numbers live locally and
        // the user can keep several and switch between them.
        //
        // What did NOT move: love/hate/exclude and max exposure stay server-side
        // in Mods[]. Only the projection itself (ProjLock / Flags&1) is local
        // now, so a set is "my numbers", not "my whole player setup".
        //
        // STORAGE SHAPE - two keys per sport+site, deliberately:
        //   fscProjSets_{sport}_{site}   the index: id, name, dates, which
        //                                slates each set covers. Small, read on
        //                                every load, never compressed.
        //   fscProjSet_{sport}_{site}_{id}  one set's actual numbers, keyed by
        //                                slate, LZString-compressed. Only the
        //                                sets actually used get decompressed.
        // Splitting them means listing sets for the picker costs one small
        // parse instead of inflating every set the user has ever made.
        var PROJ_SET_MAX = 8;          // named sets kept per sport+site
        var PROJ_SLATE_MAX = 10;       // slates kept inside one set

        vm.projSets = [];              // the index, newest-updated first
        vm.activeProjMap = null;       // {salaryId: projection} for the active set + slate, or null
        vm.projSource = 'linestar';    // viewing source: 'linestar' or a set id

        vm.projSetsKey = function () { return 'fscProjSets_' + vm.Sport + '_' + vm.Site; };
        vm.projSetKey = function (id) { return 'fscProjSet_' + vm.Sport + '_' + vm.Site + '_' + id; };
        vm.projSourceKey = function () { return 'fscProjSource_' + vm.Sport + '_' + vm.Site; };

        vm.newProjSetId = function () {
            return 'ps' + new Date().getTime().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
		};

        // ---- index ----
        vm.loadProjSets = function () {
            vm.projSets = [];
            try {
                var raw = localStorage.getItem(vm.projSetsKey());
                var arr = raw ? JSON.parse(raw) : null;
                if (arr instanceof Array) { vm.projSets = arr; }
			} catch (e) { vm.projSets = []; }

            vm.purgeStaleProjSets();
		};

        vm.saveProjSetIndex = function () {
            try {
                vm.projSets.sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
                localStorage.setItem(vm.projSetsKey(), angular.toJson(vm.projSets));
			} catch (e) { }
		};

        // ---- payload ----
        vm.readProjSetBody = function (id) {
            try {
                var raw = localStorage.getItem(vm.projSetKey(id));
                if (!raw) { return {}; }
                var json = LZString.decompressFromUTF16(raw);
                var obj = json ? JSON.parse(json) : null;
                return (obj && typeof obj === 'object') ? obj : {};
			} catch (e) { return {}; }
		};

        vm.writeProjSetBody = function (id, body) {
            try {
                localStorage.setItem(vm.projSetKey(id), LZString.compressToUTF16(angular.toJson(body)));
                return true;
			} catch (e) {
                // Almost certainly QuotaExceededError. Drop the oldest slate out
                // of the oldest set and try once more rather than losing the
                // save the user just made.
                if (vm.evictOldestProjSlate()) {
                    try {
                        localStorage.setItem(vm.projSetKey(id), LZString.compressToUTF16(angular.toJson(body)));
                        return true;
					} catch (e2) { }
				}
                vm.showtoast('Not enough browser storage to save these projections. Delete an old projection set and try again.');
                return false;
			}
		};

        // ---- housekeeping ----
        // A slate belongs to one period, and once the site has moved on to a new
        // period that slate can never be viewed again - so its numbers are dead
        // weight. This is the main thing keeping the feature inside the ~5MB
        // localStorage budget without ever asking the user to tidy up.
        vm.purgeStaleProjSets = function () {
            var cur = parseInt(LineStar.PeriodId, 10);
            if (!isFinite(cur)) { return; }

            var dirty = false;
            for (var i = vm.projSets.length - 1; i >= 0; i--) {
                var s = vm.projSets[i];
                var slates = (s.slates instanceof Array) ? s.slates : [];
                var keep = [];

                for (var j = 0; j < slates.length; j++) {
                    if (parseInt(slates[j].periodId, 10) >= cur) { keep.push(slates[j]); }
				}

                if (keep.length !== slates.length) {
                    dirty = true;
                    var body = vm.readProjSetBody(s.id);
                    var nb = {};
                    for (var k = 0; k < keep.length; k++) {
                        if (body[keep[k].slateId] != null) { nb[keep[k].slateId] = body[keep[k].slateId]; }
					}
                    s.slates = keep;
                    if (keep.length) { vm.writeProjSetBody(s.id, nb); }
                    else { try { localStorage.removeItem(vm.projSetKey(s.id)); } catch (e) { } }
				}

                // a set with nothing left in it is not worth a row in the picker
                if (!s.slates.length) { vm.projSets.splice(i, 1); dirty = true; }
			}

            if (dirty) { vm.saveProjSetIndex(); }
		};

        // Last resort when the browser refuses a write: give back the single
        // oldest slate payload we hold. Returns whether anything was freed.
        vm.evictOldestProjSlate = function () {
            var oldest = null;
            for (var i = 0; i < vm.projSets.length; i++) {
                var slates = vm.projSets[i].slates || [];
                for (var j = 0; j < slates.length; j++) {
                    if (oldest == null || (slates[j].updated || 0) < (oldest.slate.updated || 0)) {
                        oldest = { set: vm.projSets[i], slate: slates[j], idx: j };
					}
				}
			}
            if (oldest == null) { return false; }

            var body = vm.readProjSetBody(oldest.set.id);
            delete body[oldest.slate.slateId];
            oldest.set.slates.splice(oldest.idx, 1);
            try {
                localStorage.setItem(vm.projSetKey(oldest.set.id), LZString.compressToUTF16(angular.toJson(body)));
			} catch (e) { }
            vm.saveProjSetIndex();
            return true;
		};

        // ---- lookups ----
        vm.findProjSet = function (id) {
            for (var i = 0; i < vm.projSets.length; i++) {
                if (vm.projSets[i].id === id) { return vm.projSets[i]; }
			}
            return null;
		};

        vm.projSetHasSlate = function (id, slateId) {
            var s = vm.findProjSet(id);
            if (s == null) { return false; }
            for (var i = 0; i < (s.slates || []).length; i++) {
                if (String(s.slates[i].slateId) === String(slateId)) { return true; }
			}
            return false;
		};

        // Sets that actually carry numbers for the slate on screen. A set built
        // for last Sunday's main slate has nothing to say about tonight's, so
        // offering it in the picker would only produce an empty view.
        vm.projSetsForSlate = function () {
            var slateId = (vm.selectedSlate != null) ? vm.selectedSlate.Id : 0;
            var out = [];
            for (var i = 0; i < vm.projSets.length; i++) {
                if (vm.projSetHasSlate(vm.projSets[i].id, slateId)) { out.push(vm.projSets[i]); }
			}
            return out;
		};

        // ══ My Projections - the one source that lives on the server ══════════
        // Everything else in this module is browser-local. This one is not: it
        // is the original server-side override, still carried on each player's
        // mod as ProjLock + Flags&1 and still saved through
        // UpdateCustomProjectionV3, which never stopped running for love/hate
        // and max exposure.
        //
        // Deliberately NOT a stored set: there is no fscProjSet_ key for it, it
        // does not count against PROJ_SET_MAX or the storage readout, and it
        // cannot be renamed or deleted. It reads straight out of
        // periodData.Mods, which already arrives with the page - which is what
        // makes it survive a cache clear and show up in the mobile apps.
        var PROJ_MINE = 'mine';
        var MOD_FLAG_PROJ = 1;      // Flags bit 1: this mod carries a projection

        vm.isMineProjSource = function (src) { return src === PROJ_MINE; };

        // LineStar and Consensus are feeds we render, not places to put numbers
        vm.isReadOnlyProjSource = function (src) { return src === 'linestar' || src === 'consensus'; };

        // {salaryId: projection}, the same shape as activeProjMap so the
        // resolver never has to know which kind of source it is reading.
        vm.mineProjMap = null;

        vm.rebuildMineProjMap = function () {
            var map = {};
            var mods = (vm.periodData != null) ? vm.periodData.Mods : null;
            if (mods instanceof Array) {
                for (var i = 0; i < mods.length; i++) {
                    var m = mods[i];
                    if (m == null || (m.Flags & MOD_FLAG_PROJ) !== MOD_FLAG_PROJ) { continue; }
                    var v = parseFloat(m.ProjLock);
                    if (!(v > 0)) { continue; }
                    map[m.PlayerSalaryId] = LineStarUtility.round(v, 2);
				}
			}
            vm.mineProjMap = map;
            return map;
		};

        // Mods arrive for the whole PERIOD, so the count shown against this
        // slate has to be intersected with the slate's own salaries - otherwise
        // last Sunday's overrides inflate tonight's number.
        // salariesPerSlate is not created until the first slate load, so this is
        // reachable as undefined on an early digest
        vm.slateSalaryDict = function () {
            if (vm.selectedSlate == null || vm.salariesPerSlate == null) { return null; }
            return vm.salariesPerSlate[vm.selectedSlate.Id] || null;
		};

        vm.mineProjCountForSlate = function () {
            var dict = vm.slateSalaryDict();
            if (dict == null) { return 0; }
            if (vm.mineProjMap == null) { vm.rebuildMineProjMap(); }

            var n = 0;
            for (var k in vm.mineProjMap) { if (dict[k] != null) { n++; } }
            return n;
		};

        // One player's number onto their mod, then queued for the debounced
        // save. null clears the override and takes the FLAG off too - leaving it
        // set with a zero would have the server read a real projection of zero.
        vm.writeMineProjection = function (p, value) {
            var mod = vm.findOrCreateUserMod(p);
            if (mod == null) { return; }

            if (value == null) {
                mod.ProjLock = 0;
                mod.Flags = mod.Flags & ~MOD_FLAG_PROJ;
			} else {
                mod.ProjLock = value;
                mod.Flags = mod.Flags | MOD_FLAG_PROJ;
			}

            if (vm.mineProjMap == null) { vm.rebuildMineProjMap(); }
            if (value == null) { delete vm.mineProjMap[p.Id]; }
            else { vm.mineProjMap[p.Id] = value; }

            vm.pushUserModToSave(mod);
		};

        // Clears every server projection for the slate on screen. Love/hate and
        // max exposure ride on the same mod and are left alone.
        vm.clearMineForSlate = function () {
            var dict = vm.slateSalaryDict();
            var mods = (vm.periodData != null) ? vm.periodData.Mods : null;
            if (dict == null || !(mods instanceof Array)) { return; }

            var changed = [];
            for (var i = 0; i < mods.length; i++) {
                var m = mods[i];
                if (m == null || (m.Flags & MOD_FLAG_PROJ) !== MOD_FLAG_PROJ) { continue; }
                if (dict[m.PlayerSalaryId] == null) { continue; }       // belongs to another slate
                m.ProjLock = 0;
                m.Flags = m.Flags & ~MOD_FLAG_PROJ;
                changed.push(m);
			}

            if (!changed.length) { return; }
            vm.rebuildMineProjMap();
            vm.saveModsChunked(changed, null);
		};

        // Every projection the account holds for this period, not just the slate
        // on screen - the "reset all" scope. Mods carry love/hate and max
        // exposure too, so only the projection bit comes off.
        vm.clearMineAll = function () {
            var mods = (vm.periodData != null) ? vm.periodData.Mods : null;
            if (!(mods instanceof Array)) { return; }

            var changed = [];
            for (var i = 0; i < mods.length; i++) {
                var m = mods[i];
                if (m == null || (m.Flags & MOD_FLAG_PROJ) !== MOD_FLAG_PROJ) { continue; }
                m.ProjLock = 0;
                m.Flags = m.Flags & ~MOD_FLAG_PROJ;
                changed.push(m);
			}

            if (!changed.length) { return; }
            vm.rebuildMineProjMap();
            vm.saveModsChunked(changed, null);
		};

        // UpdateCustomProjectionV3 takes an array, and an imported file can be
        // six hundred players. One request would mean one very large payload and
        // one all-or-nothing failure, so it goes up in batches, sequentially,
        // and reports how far it actually got.
        var MOD_SAVE_CHUNK = 100;

        vm.saveModsChunked = function (mods, done) {
            var todo = (mods || []).slice();
            var sent = 0, failed = 0;

            var next = function () {
                if (!todo.length) {
                    if (typeof done === 'function') { done(sent, failed); }
                    return;
				}
                var batch = todo.splice(0, MOD_SAVE_CHUNK);
                webService.savePlayerAdjustments(function (ok) {
                    if (ok) { sent += batch.length; } else { failed += batch.length; }
                    next();
				}, batch);
			};

            next();
		};

        // Editing while a read-only feed is on screen. The edit is not refused,
        // it is redirected - and the user is told, because the switch can also
        // surface overrides they saved earlier and were not looking at.
        vm.swapToMineForEdit = function () {
            var from = (vm.projSource === 'consensus') ? 'Consensus' : 'LineStar';
            vm.setProjSource(PROJ_MINE);
            vm.showErrorDialog(
                'Switched to My Projections',
                from + ' projections cannot be edited, so your change was saved to My Projections and the table has switched to it. ' +
                'My Projections is saved to your account, so it follows you to the LineStar mobile apps.',
                { tone: 'notice' });
		};

        // ---- the active set ----
        // activeProjMap is a plain {salaryId: projection} object, rebuilt only
        // when the set or the slate changes. updateSalaryWithMod runs per player
        // in long loops, so the lookup there has to be a hash hit, never a scan.

        // Clears every projection this set holds for the slate on screen. Only
        // the numbers - love/hate and max exposure are server-side and untouched
        // by a projection reset, same as before the move.
        vm.clearActiveSetForSlate = function () {
            // My Projections clears on the server, not in a set body
            if (vm.isMineProjSource(vm.projSource)) { vm.clearMineForSlate(); return; }
            if (vm.isReadOnlyProjSource(vm.projSource) || vm.selectedSlate == null) { return; }

            var body = vm.readProjSetBody(vm.projSource);
            var slateId = vm.selectedSlate.Id;
            if (body[slateId] == null) { return; }

            delete body[slateId];
            vm.writeProjSetBody(vm.projSource, body);
            vm.activeProjMap = null;

            var s = vm.findProjSet(vm.projSource);
            if (s != null && s.slates instanceof Array) {
                for (var i = s.slates.length - 1; i >= 0; i--) {
                    if (String(s.slates[i].slateId) === String(slateId)) { s.slates.splice(i, 1); }
				}
                // a set with no slates left has nothing to offer the picker
                if (!s.slates.length) {
                    var si = vm.projSets.indexOf(s);
                    if (si >= 0) { vm.projSets.splice(si, 1); }
                    try { localStorage.removeItem(vm.projSetKey(vm.projSource)); } catch (e) { }
                    vm.setProjSource('linestar');
				}
                vm.saveProjSetIndex();
			}
		};

        vm.rebuildActiveProjMap = function () {
            vm.activeProjMap = null;

            // My Projections keeps its numbers in mods, not in a set body
            if (vm.isMineProjSource(vm.projSource)) { vm.rebuildMineProjMap(); return; }
            if (vm.isReadOnlyProjSource(vm.projSource) || vm.selectedSlate == null) { return; }

            var body = vm.readProjSetBody(vm.projSource);
            var slate = body[vm.selectedSlate.Id];
            vm.activeProjMap = (slate && slate.proj) ? slate.proj : null;
		};

        // null when the source is LineStar or the player has no entry - callers
        // treat null as "use the model projection".
        vm.getSetProjection = function (salaryId) {
            // My Projections is mod-backed, but the resolver should not have to
            // know that - it asks the same question and gets the same answer
            if (vm.isMineProjSource(vm.projSource)) {
                if (vm.mineProjMap == null) { vm.rebuildMineProjMap(); }
                var mv = vm.mineProjMap[salaryId];
                return (mv == null) ? null : parseFloat(mv);
			}

            if (vm.activeProjMap == null) { return null; }
            var v = vm.activeProjMap[salaryId];
            return (v == null) ? null : parseFloat(v);
		};

        // Saved per sport+site, but ALWAYS validated against the slate on screen:
        // a set built for another slate falls back to LineStar rather than
        // showing an empty column and looking broken.
        vm.loadProjSource = function () {
            var want = 'linestar';
            try { want = localStorage.getItem(vm.projSourceKey()) || 'linestar'; } catch (e) { }

            var slateId = (vm.selectedSlate != null) ? vm.selectedSlate.Id : 0;
            vm.projSource = vm.isProjSourceUsable(want) ? want : 'linestar';
            vm.rebuildActiveProjMap();
		};

        vm.setProjSource = function (src) {
            vm.projSource = src || 'linestar';
            // remembered even when it is not usable on this slate - come back to
            // the slate it belongs to and it is still selected
            try { localStorage.setItem(vm.projSourceKey(), vm.projSource); } catch (e) { }
            vm.rebuildActiveProjMap();
            vm.reapplyAllProjections();
		};

        // Whether a remembered source still applies HERE. Consensus needs a feed
        // on this slate; a set needs numbers for it. Either way the answer when
        // it does not is LineStar, never an empty column.
        vm.isProjSourceUsable = function (src) {
            if (src === 'linestar' || !src) { return false; }
            if (src === 'consensus') { return vm.slateHasConsensus(); }
            // My Projections is always selectable, empty or not - it is where
            // edits go, so "nothing here yet" is a starting state, not a reason
            // to hide it
            if (vm.isMineProjSource(src)) { return true; }
            var slateId = (vm.selectedSlate != null) ? vm.selectedSlate.Id : 0;
            return vm.projSetHasSlate(src, slateId);
		};

        vm.projSourceName = function () {
            if (vm.projSource === 'consensus') { return 'Consensus'; }
            if (vm.projSource === 'linestar') { return 'LineStar'; }
            if (vm.isMineProjSource(vm.projSource)) { return 'My Projections'; }
            var s = vm.findProjSet(vm.projSource);
            return (s != null) ? s.name : 'LineStar';
		};

        // ---- the OPTIMIZER's projection source -------------------------------
        // Independent of what the table is showing: you can study one set while
        // optimizing from another. Same three kinds of value as the view picker
        // - 'linestar', 'consensus', or a set id.
        vm.optiProjSource = 'linestar';
        vm.optiProjMap = null;

        vm.optiProjSourceKey = function () { return 'fscOptiProjSource_' + vm.Sport + '_' + vm.Site; };

        vm.loadOptiProjSource = function () {
            var saved = null;
            try { saved = localStorage.getItem(vm.optiProjSourceKey()); } catch (e) { }

            // FIRST RUN inherits whatever the table is showing. Defaulting flat
            // to 'linestar' would silently stop honouring projections a user had
            // already adjusted - they would optimize against different numbers
            // than they were looking at and never be told. Once they choose here,
            // the two are independent for good.
            if (saved == null) { saved = vm.projSource; }

            vm.optiProjSource = vm.isProjSourceUsable(saved) ? saved : 'linestar';
			vm.buildOptiProjMap();
		};

        vm.setOptiProjSource = function (src) {
            vm.optiProjSource = src || 'linestar';
            try { localStorage.setItem(vm.optiProjSourceKey(), vm.optiProjSource); } catch (e) { }
            vm.buildOptiProjMap();
		};

        // Resolved once per run rather than per player - scoring walks the whole
        // pool and this would otherwise inflate a set body on every row.
        vm.buildOptiProjMap = function () {
            vm.optiProjMap = null;
            if (vm.isReadOnlyProjSource(vm.optiProjSource)) { return; }

            // the synced source reads from mods, and does so regardless of slate
            if (vm.isMineProjSource(vm.optiProjSource)) { vm.optiProjMap = vm.rebuildMineProjMap(); return; }
            if (vm.selectedSlate == null) { return; }

            var body = vm.readProjSetBody(vm.optiProjSource);
            var slate = body[vm.selectedSlate.Id];
            vm.optiProjMap = (slate && slate.proj) ? slate.proj : null;
		};

        vm.optiProjSourceName = function () {
            if (vm.optiProjSource === 'consensus') { return 'Consensus'; }
            if (vm.isMineProjSource(vm.optiProjSource)) { return 'My Projections'; }
            var s = vm.findProjSet(vm.optiProjSource);
            return (s != null) ? s.name : 'LineStar';
		};

        // Sources offered in the optimizer row: LineStar, Consensus when the
        // slate has a feed, and any set with numbers for this slate.
        // MUST return the same array reference while nothing has changed.
        // ng-options watches this collection, and handing it fresh object
        // literals every digest meant the options were "new" every pass - the
        // digest never settled and Angular threw infdig. The signature covers
        // everything the list is built from.
        vm._optiSrcCache = null;
        vm._optiSrcSig = null;

        vm.optiProjSourcesSig = function () {
            var slateId = (vm.selectedSlate != null) ? vm.selectedSlate.Id : 0;
            var sig = slateId + '|' + (vm.slateHasConsensus() ? 1 : 0);
            for (var i = 0; i < vm.projSets.length; i++) {
                var s = vm.projSets[i];
                sig += '|' + s.id + ':' + s.name + ':' + (s.updated || 0) + ':' + ((s.slates || []).length);
			}
            return sig;
		};

        vm.optiProjSources = function () {
            var sig = vm.optiProjSourcesSig();
            if (sig === vm._optiSrcSig && vm._optiSrcCache != null) { return vm._optiSrcCache; }

            var out = [{ v: 'linestar', n: 'LineStar' }];
            if (vm.slateHasConsensus()) { out.push({ v: 'consensus', n: 'Consensus' }); }
            // always offered, empty or not - see isProjSourceUsable
            out.push({ v: PROJ_MINE, n: 'My Projections' });

            var sets = vm.projSetsForSlate();
            for (var i = 0; i < sets.length; i++) { out.push({ v: sets[i].id, n: sets[i].name }); }

            vm._optiSrcSig = sig;
            vm._optiSrcCache = out;
            return out;
		};

        // The per-player number the optimizer scores against.
        vm.getOptiSourceProjection = function (s) {
            if (vm.optiProjSource === 'consensus') {
                // the long-standing no-feed fallback: a slate that ships every
                // AggProj as 0 would otherwise score every player 0, fail the
                // `p <= 0` filter, and die on "no players were available"
                var a = LineStarUtility.ensureNumeric(s.AggProj);
                return (a > 0) ? a : s.PP;
			}

            if (vm.optiProjMap != null) {
                var v = vm.optiProjMap[s.Id];
                if (v != null) { return parseFloat(v); }
			}
            return s.PP;
		};

        // ══ Projections manager ═══════════════════════════════════════════════
        // One dialog for everything about projection sets: pick which one the
        // table shows, import a file into a new or existing set, start an empty
        // set, rename, delete. It replaces both the source chip's inline picker
        // and the old "Upload Projections" popup, which were two doors onto
        // halves of the same job.
        //
        // Three panes rather than three dialogs - importing is a continuation of
        // "manage my sets", and the player-map step is a continuation of that.
        vm.showProjManager = 0;
        vm.projMgrPane = 'list';        // 'list' | 'import' | 'map'
        vm.projMgrTargetSetId = null;   // import target: null = create a new set
        vm.projMgrName = '';
        vm.projMgrRenaming = null;      // set id being renamed inline
        vm.projMgrRenameDraft = '';
        vm.projMgrDeleting = null;      // set id armed for delete (two-step)

        vm.openProjManager = function (pane) {
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a premium member to manage projections.');
                return;
			}
            vm.showPopupSettingsPanel = 0;
            vm.projMgrPane = pane || 'list';
            vm.projMgrRenaming = null;
            vm.projMgrDeleting = null;
            vm.showProjManager = 1;
		};

        vm.closeProjManager = function () {
            vm.showProjManager = 0;
            vm.projMgrRenaming = null;
            vm.projMgrDeleting = null;
		};

        // One step back, not all the way out. The panes nest - list holds
        // import, import holds map - and backing out of a single unmatched
        // player used to land on the set list, throwing away the loaded file's
        // rows on screen. There is no deeper nesting than this, so the parent
        // is a lookup rather than a stack.
        vm.projMgrParentPane = { map: 'import', import: 'list', list: 'list' };

        vm.projMgrBack = function () {
            vm.projMgrPane = vm.projMgrParentPane[vm.projMgrPane] || 'list';
            vm.projMgrDeleting = null;

            // left the picker without choosing anyone
            if (vm.uploadedFileInfo != null) { vm.uploadedFileInfo.showPlayerMap = false; }
		};

        // the back button says where it actually goes
        vm.projMgrBackLabel = function () {
            return (vm.projMgrPane === 'map') ? 'Back to the imported players' : 'Back to projection sets';
		};

        // ---- the source list ----
        // Every set is listed, not just the ones with numbers for this slate -
        // otherwise a set you built last week becomes undeletable the moment it
        // stops applying. Ones that do not apply here are shown, explained and
        // not selectable.
        vm.projMgrSets = function () { return vm.projSets; };

        vm.projSetCountForSlate = function (s) {
            var slateId = (vm.selectedSlate != null) ? vm.selectedSlate.Id : 0;
            for (var i = 0; i < (s.slates || []).length; i++) {
                if (String(s.slates[i].slateId) === String(slateId)) { return s.slates[i].n || 0; }
			}
            return 0;
		};

        vm.pickProjSource = function (src) {
            if (src !== 'linestar' && src !== 'consensus' && !vm.isProjSourceUsable(src)) { return; }
            vm.setProjSource(src);
		};

        // ---- create / rename / delete ----
        vm.createEmptyProjSet = function () {
            var now = new Date().getTime();
            var id = vm.newProjSetId();

            vm.projSets.unshift({ id: id, name: vm.nextProjSetName('New set'), created: now, updated: now, slates: [] });
            while (vm.projSets.length > PROJ_SET_MAX) {
                var drop = vm.projSets.pop();
                try { localStorage.removeItem(vm.projSetKey(drop.id)); } catch (e) { }
			}

            // An empty set holds nothing for this slate yet, so it would not pass
            // isProjSourceUsable - seed it so selecting it is legal and the first
            // adjustment has somewhere to land.
            var body = {};
            body[vm.selectedSlate.Id] = { periodId: LineStar.PeriodId, updated: now, proj: {} };
            vm.writeProjSetBody(id, body);
            vm.touchProjSetSlate(id, vm.selectedSlate.Id, 0, now);

            vm.setProjSource(id);
            vm.startRenameProjSet(vm.findProjSet(id));
		};

        // "New set", "New set 2", ... - two identically named sets in a picker
        // are indistinguishable, and this is the one place we can cheaply avoid it
        vm.nextProjSetName = function (base) {
            var taken = {};
            for (var i = 0; i < vm.projSets.length; i++) { taken[String(vm.projSets[i].name).toLowerCase()] = 1; }
            if (!taken[base.toLowerCase()]) { return base; }
            for (var n = 2; n < 99; n++) {
                if (!taken[(base + ' ' + n).toLowerCase()]) { return base + ' ' + n; }
			}
            return base;
		};

        vm.startRenameProjSet = function (s) {
            // My Projections is not a set the user owns the naming of - it is
            // the account's own store, and the mobile apps call it the same thing
            if (s == null || vm.isMineProjSource(s.id)) { return; }
            vm.projMgrRenaming = s.id;
            vm.projMgrRenameDraft = s.name;
		};

        // The manager's "Clear this slate" on My Projections. Not a delete: the
        // source itself is permanent, only this slate's numbers go.
        vm.clearMineFromManager = function (ev) {
            if (ev) { ev.stopPropagation(); }
            vm.projMgrDeleting = null;

            var n = vm.mineProjCountForSlate();
            vm.clearMineForSlate();
            if (vm.isMineProjSource(vm.projSource)) { vm.reapplyAllProjections(); }
            vm.showtoast(n ? (n + ' adjustment' + (n === 1 ? '' : 's') + ' cleared and synced.') : 'Nothing to clear.');
		};

        vm.commitRenameProjSet = function () {
            var s = vm.findProjSet(vm.projMgrRenaming);
            var name = (vm.projMgrRenameDraft || '').trim();
            if (s != null && name.length) {
                s.name = name;
                s.updated = new Date().getTime();
                vm.saveProjSetIndex();
			}
            vm.projMgrRenaming = null;
		};

        vm.onProjSetNameKey = function (ev) {
            if (ev == null) { return; }
            if (ev.key === 'Enter') { ev.preventDefault(); vm.commitRenameProjSet(); }
            if (ev.key === 'Escape') { vm.projMgrRenaming = null; }
		};

        vm.armDeleteProjSet = function (s, ev) {
            if (ev) { ev.stopPropagation(); }
            vm.projMgrDeleting = (s != null) ? s.id : null;
		};

        vm.deleteProjSet = function (s, ev) {
            if (ev) { ev.stopPropagation(); }
            // the synced source is permanent - its slate-clear is a separate action
            if (s == null || vm.isMineProjSource(s.id)) { return; }

            var i = vm.projSets.indexOf(s);
            if (i >= 0) { vm.projSets.splice(i, 1); }
            try { localStorage.removeItem(vm.projSetKey(s.id)); } catch (e) { }
            vm.saveProjSetIndex();
            vm.projMgrDeleting = null;

            // whichever picker was pointing at it has to let go
            if (vm.projSource === s.id) { vm.setProjSource('linestar'); }
            if (vm.optiProjSource === s.id) { vm.setOptiProjSource('linestar'); }
		};

        // ---- storage readout ----
        // Shown because the budget is real and shared with everything else this
        // origin stores - someone with eight big sets should be able to see why
        // a save started failing rather than guess.
        vm.projStorageBytes = function () {
            var total = 0;
            try {
                total += (localStorage.getItem(vm.projSetsKey()) || '').length;
                for (var i = 0; i < vm.projSets.length; i++) {
                    total += (localStorage.getItem(vm.projSetKey(vm.projSets[i].id)) || '').length;
				}
			} catch (e) { return 0; }
            return total * 2;   // UTF-16 code units
		};

        // Memoised on the same signature as the source list. This is bound in the
        // dialog, so without a cache it re-read every set out of localStorage on
        // every digest - sync work behind an open modal, for a number that only
        // changes when a set does.
        vm._projStoreSig = null;
        vm._projStoreStr = '';

        vm.projStorageStr = function () {
            var sig = vm.optiProjSourcesSig();
            if (sig === vm._projStoreSig) { return vm._projStoreStr; }

            var b = vm.projStorageBytes();
            var out;
            if (b < 1024) { out = b + ' B'; }
            else if (b < 1024 * 1024) { out = Math.round(b / 1024) + ' KB'; }
            else { out = (Math.round(b / 1024 / 102.4) / 10) + ' MB'; }

            vm._projStoreSig = sig;
            vm._projStoreStr = out;
            return out;
		};

        // ---- import ----
        vm.startImportProjections = function (targetSetId) {
            vm.projMgrTargetSetId = targetSetId || null;

            var t = (targetSetId != null) ? vm.findProjSet(targetSetId) : null;
            vm.projMgrName = vm.isMineProjSource(targetSetId) ? 'My Projections'
                           : (t != null) ? t.name
                           : vm.nextProjSetName('Imported projections');

            // clear any half-finished previous import so the pane never opens
            // showing the last file's rows, or its name on the drop zone
            vm.uploadedProjItems = [];
            vm.projFileName = '';
            if (vm.uploadedFileInfo != null) {
                vm.uploadedFileInfo.saved = false;
                vm.uploadedFileInfo.fileSet = false;
                vm.uploadedFileInfo.showPlayerMap = false;
                vm.uploadedFileInfo.namesMapped = 0;
                vm.uploadedFileInfo.namesGuessed = 0;
                vm.uploadedFileInfo.namesNeedMatch = 0;
                vm.uploadedFileInfo.totalRows = 0;
			}

            vm.projMgrPane = 'import';
		};

        vm.commitImportProjections = function () {
            vm.uploadProjections(vm.projMgrName, vm.projMgrTargetSetId);
            if (vm.uploadedFileInfo != null && vm.uploadedFileInfo.saved) { vm.projMgrPane = 'list'; }
		};

        // how many rows are ready to save - drives the button's enabled state
        vm.importReadyCount = function () {
            var n = 0;
            for (var i = 0; i < (vm.uploadedProjItems || []).length; i++) {
                var it = vm.uploadedProjItems[i];
                if (it.Valid && it.Included && it.Sal != null) { n++; }
			}
            return n;
		};

        // Re-resolve every player against the current source. Cheaper than a
        // slate reload and keeps sort/filter state intact.
        vm.reapplyAllProjections = function () {
            var sals = vm.salaryListForSelSlateALL || [];
            var optSettings = vm.getOptiSettingsObj();
            for (var i = 0; i < sals.length; i++) {
                vm.updateSalaryWithMod(sals[i], sals[i].userMod, optSettings);
			}
            // rebuilds the visible list so the proj-adjusted filter and the
            // sort both reflect the new numbers - there is no separate adjusted
            // list to refresh, the filter is applied inside this pass
            if (vm.updateSalariesForSlate) { vm.updateSalariesForSlate(); }
		};

        // ---- writing into a set ----
        // Hand-adjusting while viewing LineStar has to go SOMEWHERE, and the
        // baseline is not editable. Rather than refuse the edit or silently
        // discard it, the first adjustment creates a working set - which is
        // exactly the old behaviour, except the numbers are now nameable and
        // switchable.
        vm.ensureWritableProjSet = function () {
            // anything that is not a REAL set needs a set creating. Returning the
            // source verbatim would file the numbers under a key literally named
            // 'consensus' or 'mine'.
            if (vm.findProjSet(vm.projSource) != null) { return vm.projSource; }

            var id = vm.newProjSetId();
            var now = new Date().getTime();
            // NOT "My Projections" - that name now belongs to the server-synced
            // source, and a local set wearing it would be a lie about where the
            // numbers live
            vm.projSets.unshift({ id: id, name: vm.nextProjSetName('Untitled set'), created: now, updated: now, slates: [] });
            while (vm.projSets.length > PROJ_SET_MAX) { vm.projSets.pop(); }
            vm.saveProjSetIndex();

            vm.projSource = id;
            try { localStorage.setItem(vm.projSourceKey(), id); } catch (e) { }
            vm.activeProjMap = {};
            return id;
		};

        // Takes the player, not just the salary id: the server path needs the
        // whole object to find or build its mod.
        vm.writeProjToActiveSet = function (p, value) {
            if (p == null || vm.selectedSlate == null) { return; }
            var salaryId = p.Id;

            // A read-only feed on screen redirects the edit rather than dropping
            // it. A CLEAR is the exception: there is no override on a feed to
            // remove, so switching source and popping a dialog over a no-op
            // would be pure surprise.
            if (vm.isReadOnlyProjSource(vm.projSource)) {
                if (value == null) { return; }
                vm.swapToMineForEdit();
			}

            if (vm.isMineProjSource(vm.projSource)) { vm.writeMineProjection(p, value); return; }

            var id = vm.ensureWritableProjSet();

            var body = vm.readProjSetBody(id);
            var slateId = vm.selectedSlate.Id;
            if (body[slateId] == null) {
                body[slateId] = { periodId: LineStar.PeriodId, updated: 0, proj: {} };
			}

            if (value == null) { delete body[slateId].proj[salaryId]; }
            else { body[slateId].proj[salaryId] = value; }

            var now = new Date().getTime();
            body[slateId].updated = now;
            body[slateId].periodId = LineStar.PeriodId;

            // keep one set from growing without bound across a long season
            var ids = Object.keys(body);
            while (ids.length > PROJ_SLATE_MAX) {
                var oldestId = null, oldestT = null;
                for (var i = 0; i < ids.length; i++) {
                    var t = body[ids[i]].updated || 0;
                    if (oldestT == null || t < oldestT) { oldestT = t; oldestId = ids[i]; }
				}
                if (oldestId == null || String(oldestId) === String(slateId)) { break; }
                delete body[oldestId];
                ids = Object.keys(body);
			}

            // A local write is synchronous - there is no round trip to wait on,
            // so the "saving" state has to be retired here. The server path
            // leaves it alone and lets its own callback clear it.
            if (!vm.writeProjSetBody(id, body)) { p.ProjSaving = 0; p.ProjError = 1; return; }

            vm.activeProjMap = body[slateId].proj;
            vm.touchProjSetSlate(id, slateId, Object.keys(body[slateId].proj).length, now);
            p.ProjSaving = 0;
            p.ProjError = 0;
		};

        vm.touchProjSetSlate = function (id, slateId, count, now) {
            var s = vm.findProjSet(id);
            if (s == null) { return; }
            s.updated = now;
            s.slates = (s.slates instanceof Array) ? s.slates : [];

            for (var i = 0; i < s.slates.length; i++) {
                if (String(s.slates[i].slateId) === String(slateId)) {
                    s.slates[i].updated = now;
                    s.slates[i].n = count;
                    s.slates[i].periodId = LineStar.PeriodId;
                    vm.saveProjSetIndex();
                    return;
				}
			}
            s.slates.push({ slateId: slateId, periodId: LineStar.PeriodId, updated: now, n: count });
            vm.saveProjSetIndex();
		};

        // ---- one-time cleanup after the old migration ----
        // Undoes the assumption behind the old migration rather than the
        // migration itself. That pass copied server ProjLock values into a local
        // set on the theory that projections had left the server for good; now
        // that My Projections reads them in place, the copy is a duplicate that
        // would quietly shadow the real thing.
        //
        // The copy is kept, not deleted - it costs the user nothing and might
        // hold edits made since - but it is renamed so which one is which is
        // obvious, and the source selection is moved off it onto the synced one.
        // Nothing is lost either way: the migration only ever READ the mods, so
        // the server copy it was made from is still intact.
        vm.retireMigratedProjSet = function () {
            var flag = 'fscProjRetired_' + vm.Sport + '_' + vm.Site;
            try { if (localStorage.getItem(flag) === '1') { return; } } catch (e) { return; }
            try { localStorage.setItem(flag, '1'); } catch (e) { }

            var moved = false;
            for (var i = 0; i < vm.projSets.length; i++) {
                var s = vm.projSets[i];
                var n = String(s.name || '').toLowerCase();
                if (n !== 'my saved projections' && n !== 'my projections') { continue; }

                s.name = vm.nextProjSetName('My projections (local copy)');
                if (vm.projSource === s.id) { moved = true; }
			}

            vm.saveProjSetIndex();
            if (moved) {
                vm.projSource = PROJ_MINE;
                try { localStorage.setItem(vm.projSourceKey(), PROJ_MINE); } catch (e) { }
			}
		};

        vm.teamSortDesc = LineStarUtility.loadSettingInt('teamSortDir_' + vm.Sport, 1);
        vm.teamSortKey = LineStarUtility.loadSettingStr('teamsort_' + vm.Sport, 'Game FactorsTeam');

        vm.onTeamSortChange = function(sort){

            if(sort == vm.teamSortKey){
                vm.teamSortDesc = (vm.teamSortDesc == 1) ? 0 : 1;     
			}else{
                vm.teamSortDesc = 1;
			}

            vm.teamSortKey = sort;
            localStorage.setItem('teamsort_' + vm.Sport, vm.teamSortKey);
            localStorage.setItem('teamSortDir_' + vm.Sport, vm.teamSortDesc);

            if (sort == 'Game FactorsTeam'){
                vm.teamsInSlate.sort(function (a, b) {
         
                    if (a.Name < b.Name) {
                        return (vm.teamSortDesc == 1) ? -1 : 1;
                    }
                    if (a.Name > b.Name) {
                        return (vm.teamSortDesc == 1) ? 1 : -1;
                    }
                    return 0;
                });
			}else{

                vm.colorizeTeamData();
            }
		};

        vm.updateDynamicInfo = function(){

            var val = vm.isTieredSlate();
            if(vm.dynamic.isTieredSlate != val){
                vm.dynamic.isTieredSlate = val;
            }

            val = vm.getHaveGamesStarted();
            if(vm.dynamic.haveGamesStarted != val){
                vm.dynamic.haveGamesStarted = val;
            }
        };

        vm.toggleLikedPlayerPoolOpt = function () {
            var o = vm.likedPlayerPoolOpt;
            o.Checked = !o.Checked;
            vm.onSettingToggled(o);

            if (o.Checked && !vm.canBuildWithLikedPlayerPool()) {
                vm.showtoast("WARNING: You don't have enough players liked to support using this option. Like more players.");
            }
        };

        vm.canBuildWithLikedPlayerPool = function () {
            var reqs = vm.selectedSlate.LineupRequirements;
            var snf = 0;
            for (var i = 0; i < reqs.length; i++) {
                var slot = { req: reqs[i] };
                var sf = 0;
                for (var j = 0; j < vm.likedPlayers.length; j++) {
                    if (vm.doesPlayerFitIntoSlot(slot, vm.likedPlayers[j])) {
                        sf++;
                        break;
                    }
                }
                if (!sf) { snf++; }
            }
            return (snf == 0);
        };

        vm.likedPlayerPoolOpt = null;
        vm.lineupCountOpt = null;
        vm.initLineGenSettings = function(shouldReset){
            var ao = vm.periodData.AdvancedOptions;
            var ss = vm.selectedSlate;

            if (vm.getLineGenSettingOpt(10097) == null) {
                var max = (ss != null) ? ss.LineupRequirements.length/2 : 2;
                ao.push({ Id: 'minUniquePlayers', Val1: 1, Val2: 0, Value1: 1, Value2: 0, Option: 10097, OptionType: 2, Name: 'Unique Players (V3 Only)', Desc: 'Minimum Unique Players Per Lineup', RangeMin: 1, RangeMax: max, Save: true });
            }

            var slateId = (ss != null) ? ss.Id : 0;
            var key = "linegenoptions_" + LineStar.Sport + '_' + LineStar.Site;
            var lastSavedKey = localStorage.getItem(key);
            var isCurrent = (slateId.toString() == lastSavedKey);
            var mode = (ss != null) ? ss.Mode : 0;
            var salCap = (ss != null) ? ss.SalaryCap : 0;

            for (var i = 0; i < ao.length; i++){
                var opt = ao[i];
                var key = opt.Id + '_' + LineStar.Sport + '_' + LineStar.Site;

                opt.Val1 = opt.Value1;
                opt.Val2 = opt.Value2;
                opt.Changed = 0;

                if (opt.Option == 17) {
                    vm.likedPlayerPoolOpt = opt;
                } else if (opt.Option == 102) {
                    // lineup count - surfaced as a quick edit on the mini
                    // builder's settings flyout (same object the full
                    // settings list edits, so the two stay in sync)
                    vm.lineupCountOpt = opt;
                } else if (opt.Option == 19) {
                    opt.RangeMin = 5;
                } else if (opt.Option == 110 || opt.Option == 9) {
                    opt.RangeMax = salCap;
                    opt.RangeMin = Math.round(opt.RangeMax * .6);

                    if (opt.Option == 9) {
                        opt.Val1 = opt.Value1 = opt.RangeMax;
                    } else if (opt.Option == 110) {
                        opt.Val1 = opt.Value1 = Math.round(opt.RangeMax * .8);
                    }
                }

                // Slate-derived ranges have to be settled BEFORE the stored
                // value is restored and before the slider is built - both
                // below read them. These used to sit at the END of the loop
                // body, so "Max players per team" was built against the
                // PREVIOUS slate's ceiling: set 6 on a showdown slate, switch
                // to a classic one capped at 4, and the control still offered
                // (and kept) 6.
                if (opt.Option == 1) {
                    opt.RangeMin = vm.slate_minSal;
                    opt.RangeMax = vm.slate_maxSal;
                } else if (opt.Option == 2 && ss != null) {
                    opt.RangeMax = ss.Restriction_MaxPlayersPerTeam;
                }

                if (shouldReset){
                    localStorage.removeItem(key);
                    if (opt.OptionType == 4) {
                        key += "_val2";
                        localStorage.removeItem(key);
                    } else if (opt.OptionType == 5) {
                        key += mode + "_list";
                        localStorage.removeItem(key);
                    }
                } else {
                    if (opt.Save || isCurrent) {
                        var v = localStorage.getItem(key);
                        if (v) { opt.Val1 = parseInt(v); }

                        if (opt.OptionType == 4) {
                            key += "_val2";
                            v = localStorage.getItem(key);
                            if (v) { opt.Val2 = parseInt(v); }
                        }
                    }
                }

                // The stored value is keyed by sport+site with no slate in it,
                // so a figure saved on one slate is handed straight to the
                // next - and nothing here used to check it still fits. Clamp
                // to whatever range this slate actually allows.
                //
                // RANGE TYPES ONLY (2 = slider, 4 = dual slider). Checkbox and
                // list options carry RangeMin/RangeMax too - the shared model
                // gives every option those fields, defaulted to 0 - so clamping
                // them unconditionally drove a restored Val1 of 1 down to
                // RangeMax 0, and the `Checked = (Val1 > 0)` below then read
                // false. Every saved checkbox silently reverted to unchecked on
                // the next slate change.
                if (opt.OptionType == 2 || opt.OptionType == 4) {
                    if (typeof opt.RangeMax === 'number' && opt.Val1 > opt.RangeMax) { opt.Val1 = opt.RangeMax; }
                    if (typeof opt.RangeMin === 'number' && opt.Val1 < opt.RangeMin) { opt.Val1 = opt.RangeMin; }
                    if (opt.OptionType == 4) {
                        if (typeof opt.RangeMax === 'number' && opt.Val2 > opt.RangeMax) { opt.Val2 = opt.RangeMax; }
                        if (typeof opt.RangeMin === 'number' && opt.Val2 < opt.RangeMin) { opt.Val2 = opt.RangeMin; }
                    }
                }

                if (opt.OptionType == 1) {
                    opt.Checked = (opt.Val1 > 0);
                } else if (opt.OptionType == 4) {
                    vm.initOptSlider(opt, 0);
                } else if (opt.OptionType == 5) {

                    opt.AllPositions = [];
                    opt.PosList = [];
                    var ignorePosList = ["FLEX", "UTIL"];

                    for (var j = 0; j < vm.periodData.PositionFilters.length; j++) {
                        var posList = vm.periodData.PositionFilters[j].PositionName.split(/[,\/]/);
                        for (var k = 0; k < posList.length; k++) {
                            var pos = posList[k].toUpperCase();
                            if (!opt.AllPositions.includes(pos) && !ignorePosList.includes(pos)) {
                                opt.AllPositions.push(pos);
                            }
                        }
                    }

                    
                    key += mode + "_list";
                    v = localStorage.getItem(key);
                    if (v != null) {
                        opt.PosList = JSON.parse(v);
                    }
                }

                // (the Option 1 / Option 2 range assignments used to live here,
                //  after everything that depends on them - moved to the top of
                //  the loop body)
			}

            if (shouldReset) {
                vm.updateMaxExpOnSalsDebounce();
                vm.showtoast('Options have been reset back to default values.');     
			}
        };

        vm.sliderOptions = {};

        // editable numeric boxes paired with the optimizer-setting sliders.
        // Each parses + clamps to the option's range, then commits via the
        // same path the slider uses (so the slider stays in sync).
        vm.clampOptVal = function (val, min, max) {
            var v = parseFloat(val), lo = parseFloat(min), hi = parseFloat(max);
            if (isNaN(v)) { v = isNaN(lo) ? 0 : lo; }
            if (!isNaN(lo) && v < lo) { v = lo; }
            if (!isNaN(hi) && v > hi) { v = hi; }
            return v;
        };
        vm.onOptValChanged = function (opt) {
            opt.Val1 = vm.clampOptVal(opt.Val1, opt.RangeMin, opt.RangeMax);
            vm.onSettingToggled(opt);
        };
        vm.onOptPosValChanged = function (opt, opt2) {
            opt2.Val = vm.clampOptVal(opt2.Val, opt.RangeMin, opt.RangeMax);
            vm.onSettingToggled(opt);
        };
        vm.onOptRangeChanged = function (opt) {
            var v1 = vm.clampOptVal(opt.Val1, opt.RangeMin, opt.RangeMax);
            var v2 = vm.clampOptVal(opt.Val2, opt.RangeMin, opt.RangeMax);
            if (v1 > v2) { var t = v1; v1 = v2; v2 = t; }
            opt.Val1 = v1; opt.Val2 = v2;
            var so = vm.sliderOptions[opt.Id];
            if (so && so.onChange) { so.onChange.call(so, opt.Id); }
            // the rzslider's own model-watch isn't reliable in the (initially
            // hidden) flyout, so force it to reposition to the typed values.
            setTimeout(function () { try { $scope.$broadcast('rzSliderForceRender'); } catch (e) { } }, 0);
        };

        vm.initOptSlider = function (opt, isAStackSetting) {
            var opts = vm.sliderOptions[opt.Id];
            if (opts == null) {
                opts = {
                    forStack: isAStackSetting,
                    slider: opt,
                    floor: opt.RangeMin,
                    ceil: opt.RangeMax,
                    step: opt.RangeMax > 1000 ? 100 : 1,
                    minLimit: opt.RangeMin,
                    maxLimit: opt.RangeMax,
                    onChange: function (id) {
                        this.slider.Changed = 1;
                        if (this.forStack) {
                            vm.saveStackOptions();
                        } else {
                            vm.saveLineGenSettingsDebounce();
                        }
                    },
                    onStart: function (id) { },
                    onEnd: function (id) { },
                };
                vm.sliderOptions[opt.Id] = opts;
            } else {
                opts.forStack = isAStackSetting;
                opts.slider = opt;
                opts.floor = opt.RangeMin;
                opts.ceil = opt.RangeMax;
                opts.step = opt.RangeMax > 1000 ? 100 : 1;
                opts.minLimit = opt.RangeMin;
                opts.maxLimit = opt.RangeMax;
            }
        };

        vm.saveLineGenSettings = function(){
            var ao = vm.periodData.AdvancedOptions;
            for(var i=0;i<ao.length;i++){
                if(ao[i].Changed){
                    var key = ao[i].Id + '_' + LineStar.Sport + '_' + LineStar.Site;
                    localStorage.setItem(key, ao[i].Val1.toString());

                    if (ao[i].OptionType == 4) {
                        key += "_val2";
                        localStorage.setItem(key, ao[i].Val2.toString());
                    }

                    if (ao[i].OptionType == 5) {
                        key += vm.selectedSlate.Mode + "_list";
                        var json = angular.toJson((ao[i].PosList != null) ? ao[i].PosList : []);
                        localStorage.setItem(key, json);
                    }

                    ao[i].Changed = 0;
                }
            }

            var slateId = (vm.selectedSlate != null) ? vm.selectedSlate.Id : 0;
            var key = "linegenoptions_" + LineStar.Sport + '_' + LineStar.Site;
            localStorage.setItem(key, slateId);
        };
        vm.saveLineGenSettingsDebounce = LineStarUtility.debounce(vm.saveLineGenSettings, 500, $scope);

        vm.onPosRangeOptionDelete = function (opt, posOpt) {
            var idx = opt.PosList.indexOf(posOpt);
            if (idx >= 0) {
                opt.PosList.splice(idx, 1);
                opt.Changed = 1;
                vm.saveLineGenSettingsDebounce();
            }
        };

        vm.updatePosRangeOption = function (opt, pf) {
            var add = 1;
            for (var i = 0; i < opt.PosList.length; i++) {
                if (opt.PosList[i].Pos === pf) {
                    add = 0;
                    break;
                }
            }
            if (add) {
                opt.PosList.push({ Val: opt.Value1, Pos: pf });
                opt.Changed = 1;
                vm.saveLineGenSettingsDebounce();
            } else {
                vm.showtoast('That position is already set.');
            }
        };

        vm.onSettingToggled = function(opt){
            if (opt.OptionType == 1) {
                opt.Val1 = opt.Checked ? 1 : 0;
                opt.Changed = 1;
            }else if(opt.OptionType == 2){
                opt.Changed = 1;
            } else if (opt.OptionType == 5) {
                opt.Changed = 1;
            }

            if (opt.Option == 8 || opt.Option == 19 || opt.Option == 10) {
                if (opt.Option == 8) {

                }

                vm.updateMaxExpOnSalsDebounce();
            }

            vm.saveLineGenSettingsDebounce();
        };

        vm.updateMaxExpOnSals = function () {
            var optSettings = vm.getOptiSettingsObj();
            var dictForSlate = (vm.selectedSlate != null) ? vm.salariesPerSlate[vm.selectedSlate.Id] : {};
            for (var key in dictForSlate) {
                var ps = dictForSlate[key];
                if (ps == null || ps == undefined) { continue; }
                ps.MaxExp = vm.getMaxExp(ps, optSettings);
            }
        };
        vm.updateMaxExpOnSalsDebounce = LineStarUtility.debounce(vm.updateMaxExpOnSals, 250, $scope);

        vm.onLineupBuilderEmptySlotSelected = function(slot){
            vm.lineupBuilder.activeSlotIdx = slot.idx;

            if (vm.manualProgressBuilderSlotFilter) {
                vm.updatePosFilterFromBuilderSlot(slot);
            }
		};

        vm.updatePosFilterFromBuilderSlot = function (slot) {
            if (slot.req != null) {
                var fp = null;
                var pf = vm.periodData.PositionFilters;
                for (var i = 0; i < pf.length; i++) {
                    if (pf[i].FilterText == slot.req.PositionName) {
                        fp = pf[i];
                        break;
                    }
                }

                vm.filter_pos = fp;
                vm.filter_posList = slot.req.Positions.split(/[,\/]/);
            }

            vm.refreshPositionFiltersState();
            vm.filter_debounceShort();
        };

        vm.onLineupBuilderClearSlot = function(slot, allowSlotChange){
            // Defaults to true. This line always makes the freed slot active, so
            // omitting the flag left the slot selected with no matching position
            // filter - the slot X and the hover tip's "Remove player" both did
            // that. Every single-slot removal frees a spot the user is about to
            // refill; clearCurrentLineup passes false explicitly, since it clears
            // every slot and one filter jump per slot is just noise.
            if (allowSlotChange === undefined) { allowSlotChange = true; }
            if(slot.salary != null){
                slot.salary.IsLocked = false;     
			}
            slot.salary = null;
            slot.PlayerImg = null;
            slot.PlayerOppTeamImg = null;
            slot.Proj = 0;
            slot.SalaryStr = "$0";
            slot.pOwn = null;

            vm.lineupBuilder.activeSlotIdx = slot.idx;
            if (vm.autoProgressBuilderSlotFilter && allowSlotChange){
                vm.updatePosFilterFromBuilderSlot(slot);
            }

            vm.updateLineupBuilderValues();
            vm.saveLineupBuilder();
		};

        vm.updateLineupBuilderValues = function(lb){
            lb = (lb == null || lb == undefined) ? vm.lineupBuilder : lb;
            var realUpdate = (lb == vm.lineupBuilder);
            var empty = 0;
            var filled = 0;
            lb.SalUsed = 0;
            lb.TotalProjected = 0;
            lb.SalLeft = lb.SalaryCap;

            for(var i=0; i <lb.slots.length;i++){
                var slot = lb.slots[i];
                var p = slot.salary;
                if(p != null){

                    var sal = p.SAL;
                    var pp = p.UserPP;

                    if(slot.req.SalMult > 1){
                        sal *= slot.req.SalMult;
				    }
                    if(slot.req.PointMultiplier > 1){
                        pp = LineStarUtility.round((pp*slot.req.PointMultiplier), 2);
					}

                    lb.SalUsed += sal;
                    lb.TotalProjected += pp;
                    lb.SalLeft -= sal;
                    if (realUpdate && !p.IsLocked){
                        p.IsLocked = true;           
					}
                    filled++;
				}else{
                    empty++;        
				}
			}

            lb.SlotsFilled = filled;
            lb.isFull = (filled == lb.slots.length);
            lb.TotalProjected = LineStarUtility.round(lb.TotalProjected, 2);
            lb.SalLeftPerSlot = (empty > 0) ? LineStarUtility.round(lb.SalLeft/empty, 1) : 0;
		};

        vm.clearCurrentLineup = function (){
            if(vm.lineupBuilder == null) {return;}
            var lr = vm.lineupBuilder.slots;
            for(var i=0; i <lr.length;i++){
                if(lr[i].salary != null){
                    vm.onLineupBuilderClearSlot(lr[i], false);
				}
            }

            vm.lineupBuilder.activeSlotIdx = 0;
            vm.filterPos(lr[0].req.PositionName);
            
            vm.updateLineupBuilderValues();
            vm.saveLineupBuilder();
		};

    
        vm.createEmptyLineup = function(manual){
            //vm.clearCurrentLineup(manual);

            var lb = {};
            lb.slots = [];
            lb.SalUsed = 0;
            lb.SalLeftPerSlot = 0;
            lb.TotalProjected = 0;
            lb.activeSlotIdx = -1;
            lb.SalaryCap = (vm.selectedSlate != null) ? vm.selectedSlate.SalaryCap : 0;
            lb.SalLeft = lb.SalaryCap;
            lb.SlotsFilled = 0;
            lb.isFull = false;
            lb.version = vm.lineupBuilderVersion;

            var lr = (vm.selectedSlate != null) ? vm.selectedSlate.LineupRequirements : null;
            if(lr != null && lr != undefined){
                for(var i=0; i <lr.length;i++){
                    lb.slots.push({salary:null, req:lr[i], idx:i, SalaryStr:'$0',Proj:0 });
			    }
            }
            vm.lineupBuilder = lb;
            if(vm.selectedSlate != null){
                vm.lineupBuilderPortal.Slates[vm.selectedSlate.Id] = lb;
                if(manual && vm.manualProgressBuilderSlotFilter){
                    vm.updatePosFilterFromBuilderSlot(lb.slots[0]);
                }
            }
		};

        vm.doesPlayerFitIntoSlot = function (slot, p, useFiltered) {
            var pos = slot.req.Positions;
            if (useFiltered == 1) {
                var ss = slot.req.Data.PosListStr;
                if (ss != null && ss.length > 0) {
                    pos = ss;
                }
            }
            return vm.doesPositionMatch(p.LineupPos, pos.split(/[,\/]/));
		};

        vm.getNextEmptySlotPlayerFits = function(p, lb){
            lb = (lb == null || lb == undefined) ? vm.lineupBuilder : lb;
            var lr = lb.slots;
            for(var i=0; i <lr.length;i++){
                if(lr[i].salary == null && vm.doesPlayerFitIntoSlot(lr[i], p)){
                    return lr[i];
				}
			}
            return null;
		};

        vm.getLineupBuilderEmptySlotCnt = function(lb){
            lb = (lb == null || lb == undefined) ? vm.lineupBuilder : lb;
            var lr = lb.slots;
            var cnt = 0;
            for(var i=0; i <lr.length;i++){
                if(lr[i].salary == null){
                    cnt++;
				}
			}
            return cnt;
		};

        vm.getLineupBuilderEmptySlot = function(startIdx, lb){
            lb = (lb == null || lb == undefined) ? vm.lineupBuilder : lb;
            var lr = lb.slots;
            for(var i=startIdx; i <lr.length;i++){
                if(lr[i].salary == null){
                    return lr[i];
				}
			}
            return null;
		};

        vm.removePlayerFromLineupBuilder = function(p){
            var lr = vm.lineupBuilder.slots;
            for(var i=0; i <lr.length;i++){
                if(lr[i].salary == p){
                    vm.onLineupBuilderClearSlot(lr[i], true);
                    break;
				}
			}
		};

        vm.onHandleLineupBuilderAfterSlateChange = function () {
            var ss = vm.selectedSlate;
            var lb = (ss != null) ? vm.lineupBuilderPortal.Slates[ss.Id] : null;
            if (lb == null || lb === undefined || lb.version != vm.lineupBuilderVersion){
                vm.createEmptyLineup(0);
            }else{
                vm.lineupBuilder = lb;     

                for (var i = 0; i < lb.slots.length; i++){
                    
                    var sal = lb.slots[i].salary;
                    if (sal != null){
                        sal.IsLocked = true;
                    }
                    if (ss != null) {
                        lb.slots[i].req = ss.LineupRequirements[i];
                    }
				}
			}
		};

        vm.loadLineupBuilder = function(){
            var json = localStorage.getItem('lineupbuilder_' + LineStar.Sport + '_' + LineStar.Site, '');
            if(json != null && json.length > 0){
                vm.lineupBuilderPortal = $.parseJSON(json);
			}
            if(vm.lineupBuilderPortal == null || (LineStar.PeriodId != vm.lineupBuilderPortal.PID)){
                vm.lineupBuilderPortal = {PID: LineStar.PeriodId, Sport: LineStar.Sport, Slates: {}};     
			}else{
                //replace salaries so they're linked
                for(var key in vm.lineupBuilderPortal.Slates){
                    var lb = vm.lineupBuilderPortal.Slates[key];
                    for(var i=0; i<lb.slots.length; i++){
                        if(lb.slots[i].salary != null){

                            var salDict = vm.salariesPerSlate[key];
                            var newSal = salDict[lb.slots[i].salary.Id];

                            vm.updateBuilderSlotWithPlayer(lb.slots[i], newSal);
					    }
                    }
                    lb.activeSlotIdx = -1;
                }
			}
		};
        

        vm.saveLineupBuilder = function () {
            var json = angular.toJson(vm.lineupBuilderPortal);
            localStorage.setItem('lineupbuilder_' + LineStar.Sport + '_' + LineStar.Site, json);
		};

        vm.addPlayerToLineupBuilder = function(p, lineupBuilder, noProgress){
            var isRealUpdate = (lineupBuilder == null || lineupBuilder == undefined);
            var lb = isRealUpdate ? vm.lineupBuilder : lineupBuilder;
            var curSlot = remPlayer = null;
            var actSlot = lb.slots[(lb.activeSlotIdx >= 0) ? lb.activeSlotIdx : 0];
            var added = false;

            // normal flow prefers the active slot (lets you replace its player);
            // the lock path (noProgress) ignores it and always fills the next
            // empty fitting slot, so repeated locks never overwrite each other.
            if(!noProgress && vm.doesPlayerFitIntoSlot(actSlot, p)){
                curSlot = actSlot;
			}
            else{
                curSlot = vm.getNextEmptySlotPlayerFits(p, lb);
			}

            if(curSlot != null){
                vm.updateBuilderSlotWithPlayer(curSlot, p);
                vm.updateLineupBuilderValues(lineupBuilder);

                var emptySlot = vm.getLineupBuilderEmptySlot(curSlot.idx+1, lineupBuilder);
                if(emptySlot == null){
                    emptySlot = vm.getLineupBuilderEmptySlot(0, lineupBuilder);
				}

                if(noProgress){ /* rabLock: don't auto-progress; the user hasn't engaged the builder (see onPlayerRowLocked) */ }
                else if(emptySlot != null){
                    lb.activeSlotIdx = emptySlot.idx;
                    if(vm.autoProgressBuilderSlotFilter && isRealUpdate){
                        vm.updatePosFilterFromBuilderSlot(emptySlot);
                    }
				}else{
                    //Lineup is full
                    lb.activeSlotIdx = -1;
				}

                if(isRealUpdate){
                    vm.saveLineupBuilder();
                }

                added = true;
			}else{  
                if(isRealUpdate){
                    vm.showtoast('Unable to fit player into the Lineup Builder');
                }
			}

            //TODO: This shouldnt be needed - and is SLOW!! FIgure out why its needed
            //$scope.$digest();
            return added;
		};

        vm.updateBuilderSlotWithPlayer = function(slot, p){
            slot.salary = p;
            slot.PlayerImg = vm.getPlayerImg(p);
            slot.PlayerTeamImg = vm.getPlayerTeamImgUrl(p, 0);
            slot.PlayerOppTeamImg = vm.getPlayerTeamImgUrl(p, 1);
            slot.pOwn = p.Owned + "%";

            var sal = p.SAL;
            var pp = p.UserPP;
            if(slot.req.SalMult > 1){
                sal *= slot.req.SalMult;
			}
            if(slot.req.PointMultiplier > 1){
                pp = LineStarUtility.round((pp*slot.req.PointMultiplier), 2);
			}

            slot.SalaryStr = vm.getSalaryStr(sal);
            slot.Proj = pp;
        };

        vm.updateSalariesForSlate = function(){

            vm.hiddenSalariesForSlate = [];
            vm.salaryListForSelSlate = [];
            vm.likedPlayers = [];
            vm.excludedPlayers = [];
            vm.adjustedPlayers = [];
            vm.expAdjustedPlayers = [];

            vm.count_liked = 0;
            vm.count_filtered = 0;
            vm.count_injured = 0;
            vm.count_removed = 0;
            vm.count_projAdj = 0;
            vm.count_total = 0;
            vm.count_expAdj = 0;

            var filterPosList = vm.filter_posList;
            if (vm.filter_pos != null && filterPosList == null){
                filterPosList = [];
                var posArray = vm.filter_pos.PositionName.split(/[,\/]/);
                for(var j=0;j<posArray.length;j++){
                    filterPosList.push(posArray[j]);    
				}
            }

            var isTier = (vm.selectedSlate != null && vm.selectedSlate.IsTiered);
            var teamsFilterActive = (Object.keys(vm.filter_teams).length > 0);
            var ss = vm.salaryListForSelSlateALL;
            var salariesToSort = [];
            var checkForAdjustmentFilters = (vm.showOnlyLikedPlayers || vm.showOnlyExcludedPlayers || vm.showOnlyProjAdjustedPlayers || vm.showOnlyExposureAdjustedPlayers);

            for (var i = 0; i < ss.length; i++) {
                var ps = ss[i];

                if(ps.IS>0){
                    vm.count_injured++;           
				}
                if(!ps.IsIncluded){
                    vm.count_removed++;
                    vm.excludedPlayers.push(ps);
				}
                if(ps.IsLiked){
                    vm.count_liked++;
                    vm.likedPlayers.push(ps);
                }
                if (ps.ProjLocked == 1) {
                    vm.count_projAdj++;
                    vm.adjustedPlayers.push(ps);   // feeds the Manage expander's list
                }
                if (vm.hasUserModifiedMaxExp(ps)) {
                    vm.count_expAdj++;
                    vm.expAdjustedPlayers.push(ps);
                }
                    
                if(vm.hideZeroProj && ps.PP <= 0){
                    if(vm.filter_name == null || LineStarUtility.removeDiacritics(ps.Name).indexOf(vm.filter_name) < 0){
                        continue;           
					}         
				}
                if(vm.filter_name != null && LineStarUtility.removeDiacritics(ps.Name).indexOf(vm.filter_name) < 0){
                    vm.count_filtered++;
                    continue;           
				}
                if(filterPosList != null && !vm.doesPositionMatch(ps.LineupPos, filterPosList)){
                    vm.count_filtered++;
                    continue;
				}
                if(teamsFilterActive){
                    var filt = vm.filter_teams[ps.PTID];
                    if(filt == null || filt === undefined){
                        vm.count_filtered++;
                        continue;
                    }
                }

                if (!isTier && (ps.SAL > vm.filter_maxSalary || ps.SAL < vm.filter_minSalary)) {
                    vm.count_filtered++;
                    continue;
                }

                if (checkForAdjustmentFilters) {
                    if ((vm.showOnlyLikedPlayers && ps.IsLiked) ||
                        (vm.showOnlyExcludedPlayers && !ps.IsIncluded) ||
                        (vm.showOnlyProjAdjustedPlayers && ps.ProjLocked == 1) ||
                        (vm.showOnlyExposureAdjustedPlayers && vm.hasUserModifiedMaxExp(ps))) {
             
                    }
                    else {
                        vm.count_filtered++;
                        continue;
                    }
                }
                if (vm.activeStatFilter != null) {
                    if (vm.isPlayerFiltered(ps)) {
                        vm.count_filtered++;
                        continue;
                    }
                }

                // per-column header range filters (no-op when none are set)
                var cfBad = false;
                for (var cfk in vm.colFilters) {
                    var cf = vm.colFilters[cfk];
                    if (!cf) { continue; }
                    var cv = vm.getColFilterValue(ps, cf.sortMethod, cf);
                    if (typeof cv !== 'number' || isNaN(cv) || (cf.min != null && cv < cf.min) || (cf.max != null && cv > cf.max)) { cfBad = true; break; }
                }
                if (cfBad) { vm.count_filtered++; continue; }

                ps.IsLocked = vm.isPlayerInBuilder(ps);
                ps.SalStr = vm.getPlayerSalStr(ps);

                salariesToSort.push(ps);
            }

            vm.count_total = salariesToSort.length;

            vm.sortSalaries(salariesToSort);

            var shownHeight = 0;
            for (var i = 0; i < salariesToSort.length; i++) {
                var ps = salariesToSort[i];

                if (shownHeight < 25) {
                    shownHeight += ps.IsExpanded ? 5 : 1;
                    vm.salaryListForSelSlate.push(ps);
                } else {
                    vm.hiddenSalariesForSlate.push(ps);
                }
            }

            // Open the top row as a worked example, until they have used the
            // expander themselves. Cleared immediately - this runs on every
            // filter and sort too, and re-opening row one each time would fight
            // the user; it re-arms on the next page load while unlearned.
            if (vm.expandFirstRowPending) {
                vm.expandFirstRowPending = false;
                if (vm.salaryListForSelSlate.length > 0) {
                    vm.salaryListForSelSlate[0].IsExpanded = true;
                }
            }

            // card mode hosts a chart per card: after any list rebuild (initial
            // load, filter, sort) re-render the charts now in view. Debounced +
            // viewport-gated, so this is cheap when nothing chart-bearing shows.
            if (vm.cardMode && vm.chart_debounce) { vm.chart_debounce(); }
        };

        vm.saveSortMethod = function(){
            if(vm.sortMethod >= 0){
                LineStarUtility.saveSettingInt('sortMethod', vm.sortMethod);
                LineStarUtility.saveSettingInt('sortDesc', vm.sortDesc);
            }
		};

        vm.getPlayerSortValue = function(p, i, raw){
            if(p == null || p == undefined){
                return 0;     
			}

            var v = 0;
            var zp = 0;
            // zk: this column's value is meaningful even when YOUR projection is 0,
            // so it opts out of the zero-proj-last rule below. See case 20 / 28.
            var zk = 0;

            switch(i){
                case -1:
                    v = vm.getPlayerMatchupDataEleValBySid(vm.matchupDataSorter, p, vm.matchupDataSorterColIdx);
                    zp = 1;
                    break;
                case 0: {
                    //var ss = (vm.selectedSlate != null && vm.selectedSlate.SalaryCap >= 9999);
                    //var mil = ss ? 1000 : 10;
                    //return LineStarUtility.round(p.UserPP / (p.SAL/mil), 1);    
                    v = (p.UserPP / p.SAL);
                }
                    break;
                case 1:
                    v = p.SAL;
                    break;
                case 2:
                    v = p.UserPP;
                    break;
                case 3:
                    v = p.LoveCount;
                    break;
                case 4:
                    v = p.HateCount;
                    break;
                case 5:
                    v = p.PS;
                    break;
                case 6:
                    v = p.Conf;
                    zp = 1;
                    break;
                case 7:
                    v = p.MessageCount;
                    break;
                case 8:
                    v = (LineStar.Sport == 6 || LineStar.Sport == 3) ? p.LU : 0;
                    break;
                case 9:
                    v = (LineStar.Sport == 6) ? p.PPL : 0;
                    break;
                case 10:
                    v = p.Floor;
                    zp = 1;
                    break;
                case 11:
                    v = p.Ceil;
                    zp = 1;
                    break;
                case 12:
                    v = p.PPG;
                    zp = 1;
                    break;
                case 13:
                    v = p.Tier;
                    break;
                case 14:
                    v = (p.OppRank / p.OppTotal) * 100;
                    zp = 1;
                    break;
                case 15:
                    v = p.Owned; break;
                case 16:
                    v = p.AlertScore;
                    zp = 1;
                    break;
                case 17:
                    v = p.MatchupScore;
                    zp = 1;
                    break;
                case 18:
                    v = vm.getPlayerImp(p); break;
                case 19:
                    v = vm.getPlayerLeverage(p); break;
                case 20:
                    // consensus stands on its own - a player the industry projects at
                    // 15 belongs at the TOP of a consensus sort whether or not you
                    // have your own number for them yet
                    v = p.AggProj; zk = 1; break;
                case 21:
                    v = vm.getSafetyProj(p); break;
                case 22:
                    v = p.dataCol0; break;
                case 23:
                    v = p.dataCol1; break;
                case 24:
                    v = p.dataCol3; break;
                case 25:
                    v = (vm.contestOwnershipForSlate != null) ? vm.getPlayerActualOwn(p, vm.contestOwnershipForSlate) : 0; break;
                case 26:
                    v = p.Name; break;
                case 27:
                    v = p.SIC; break;
                case 28:
                    // a 0 projection is not missing data here, it is half the
                    // calculation - consensus 15 against your 0 is the single biggest
                    // disagreement on the board, exactly what this column is for
                    v = p.AggProj - p.UserPP; zk = 1; break;
                case 29:
                    v = (p.UserPP / p.SAL);
                    v += (p.Ceil / p.SAL);
                    zp = 1;
                    break;
                case 30:
                    v = parseInt(p.MaxExp); break;
            }

            // Not playing / no data -> sort LAST in either direction. Always for the
            // inherently-stat columns (zp: matchup/floor/etc., where a 0-proj value is
            // meaningless); for every other column it's governed by the user setting
            // "Rank 0-projection players last" (on by default). The comparator maps '-'
            // to the far end of the sort. (Plain -1 wasn't low enough for columns that
            // can go negative, e.g. Matchup Data.)
            //
            // zk opts a column OUT entirely: the consensus columns read a number that
            // exists independently of your projection, so a 0 there is real data rather
            // than an absence - and burying those players hid the biggest edges the
            // Consensus Diff column exists to find.
            if (!raw && !zk && (zp || vm.zeroProjLast) && p.UserPP == 0) {
                v = '-';
            }

            return v;
		};

      
        vm.sortSalaries = function (salariesToSort){
            salariesToSort.sort(function (a, b) {
                var c1, c2;
                
                c1 = vm.getPlayerSortValue(a, vm.sortMethod);
                c2 = vm.getPlayerSortValue(b, vm.sortMethod);

                if(c1 == '-'){
                    c1 = vm.sortDesc ? -10000 : 1000000;
				}
                if(c2 == '-'){
                    c2 = vm.sortDesc ? -10000 : 1000000;
				}

                if (c2 == 0 && c1 == 0 || c2 == c1) {
                    c1 = (a.UserPP / a.SAL);
                    c2 = (b.UserPP / b.SAL);
                }

                if (!vm.sortDesc) {
                    var t = c2;
                    c2 = c1;
                    c1 = t;
                }

                if(vm.sortMethod == 26){
                    return c1.localeCompare(c2);
				}

                return c2 - c1;
            });
		};

        // ===== per-column header range filters =====
        // colFilters: attr-col -> {min,max,sortMethod,label}. The header menu's
        // "Filter" item (sortable columns only) opens a slider bound to thFilter
        // for the active column; applying writes colFilters and re-filters. Values
        // come from getPlayerSortValue(raw) so they match the sort scale.
        vm.colFilters = {};
        vm.thFilter = {
            show: false, key: null, sortMethod: null, mdId: null, colIdx: null, label: '',
            min: 0, max: 0, scaleMin: 0, scaleMax: 0,
            options: { floor: 0, ceil: 1, step: 1, onChange: function () { vm.onColFilterChanged(); } },
            left: 0, top: 0
        };
        vm.colFilterCount = function () { var n = 0; for (var k in vm.colFilters) { if (vm.colFilters[k]) { n++; } } return n; };
        vm.isColFiltered = function (key) { return !!vm.colFilters[key]; };
        // The value to FILTER a column by - aligned to what the column DISPLAYS,
        // not the raw sort value (which for some columns is scaled or sentinel-laden):
        //   - Value (0): the shown "x" number (p.VAL), not the UserPP/SAL ratio
        //   - batting order (8, MLB/MILB): p.LU is 1-9, but 100 for players not in a
        //     lineup - exclude those so the scale is the true order range
        // Returns NaN for "no value" so getColScale skips it and a set range excludes it.
        vm.getColFilterValue = function (p, sortMethod, cf) {
            if (p == null) { return NaN; }
            // per-matchup-stat filter (a matchupTableMini row): value from md + colIdx
            if (cf && cf.mdId != null) {
                var mmd = vm.getMatchupDataColById(cf.mdId);
                if (!mmd) { return NaN; }
                var mv = vm.getPlayerMatchupDataEleValBySid(mmd, p, cf.colIdx);
                return (typeof mv === 'number' && !isNaN(mv)) ? mv : NaN;
            }
            if (sortMethod === 0) {
                var vx = parseFloat(p.VAL);
                return isNaN(vx) ? NaN : vx;
            }
            if (sortMethod === 8 && (LineStar.Sport == 6 || LineStar.Sport == 3)) {
                var lu = parseFloat(p.LU);
                return (isNaN(lu) || lu <= 0 || lu >= 100) ? NaN : lu;
            }
            var v = vm.getPlayerSortValue(p, sortMethod, true);
            return (typeof v === 'number') ? v : NaN;
        };
        // min/max/step for a column across the full slate (display-aligned values).
        // cf carries matchup-stat context (mdId/colIdx) when filtering a matchup row.
        vm.getColScale = function (sortMethod, cf) {
            var list = vm.salaryListForSelSlateALL || [];
            var min = Infinity, max = -Infinity, found = false;
            for (var i = 0; i < list.length; i++) {
                var val = vm.getColFilterValue(list[i], sortMethod, cf);
                if (typeof val !== 'number' || isNaN(val)) { continue; }
                found = true;
                if (val < min) { min = val; }
                if (val > max) { max = val; }
            }
            if (!found) { min = 0; max = 1; }
            if (max <= min) { max = min + 1; }
            // ~40 steps, rounded to a 1/2/5 x 10^n "nice" value
            var rawStep = (max - min) / 40;
            var mag = Math.pow(10, Math.floor(Math.log(rawStep) / Math.LN10));
            var norm = rawStep / mag;
            var step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
            var precision = step >= 1 ? 0 : (step >= 0.1 ? 1 : (step >= 0.01 ? 2 : 3));
            return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step: step, precision: precision };
        };
        // slider label formatter: applies precision + a column suffix (e.g. "X" for
        // Value), and marks an OPEN end - "+" when the high handle sits at the ceiling
        // (no upper bound) and "−" when the low handle sits at the floor (no lower bound).
        vm.colFilterTranslate = function (scale, suffix) {
            return function (v, sliderId, label) {
                var s = (scale.precision > 0) ? v.toFixed(scale.precision) : String(Math.round(v));
                s += (suffix || '');
                if (label === 'high' && v >= scale.max) { return s + '+'; }
                if (label === 'model' && v <= scale.min) { return s + '−'; }
                return s;
            };
        };
        vm.openColumnFilter = function (key, sortMethod, label, rect) {
            var scale = vm.getColScale(sortMethod);
            var ex = vm.colFilters[key];
            var tf = vm.thFilter;
            tf.key = key; tf.sortMethod = sortMethod; tf.mdId = null; tf.colIdx = null; tf.label = label || key;
            tf.scaleMin = scale.min; tf.scaleMax = scale.max;
            tf.min = (ex && ex.min != null) ? ex.min : scale.min;
            tf.max = (ex && ex.max != null) ? ex.max : scale.max;
            tf.options = { floor: scale.min, ceil: scale.max, step: scale.step, precision: scale.precision, onChange: function () { vm.onColFilterChanged(); }, translate: vm.colFilterTranslate(scale, sortMethod === 0 ? 'X' : '') };
            var pad = 8, w = 264;
            var left = rect ? rect.left : 120;
            if (left + w > window.innerWidth - pad) { left = window.innerWidth - pad - w; }
            if (left < pad) { left = pad; }
            tf.left = left;
            tf.top = (rect ? rect.bottom : 120) + 6;
            tf.show = true;
            setTimeout(function () { try { $scope.$broadcast('rzSliderForceRender'); } catch (e) { } }, 0);
        };
        // open the range slider for a specific matchup stat (md + column index),
        // invoked by the "Filter" action on a matchupTableMini row. Reuses the same
        // thFilter slider + colFilters pipeline, keyed mu:<mdId>:<colIdx>.
        vm.openMatchupStatFilter = function (mdId, colIdx, label, rect) {
            if (mdId == null || colIdx == null || isNaN(colIdx)) { return; }
            var key = 'mu:' + mdId + ':' + colIdx;
            var ctx = { mdId: mdId, colIdx: colIdx };
            var scale = vm.getColScale(-1, ctx);
            var ex = vm.colFilters[key];
            var tf = vm.thFilter;
            tf.key = key; tf.sortMethod = -1; tf.mdId = mdId; tf.colIdx = colIdx; tf.label = label || 'Matchup stat';
            tf.scaleMin = scale.min; tf.scaleMax = scale.max;
            tf.min = (ex && ex.min != null) ? ex.min : scale.min;
            tf.max = (ex && ex.max != null) ? ex.max : scale.max;
            tf.options = { floor: scale.min, ceil: scale.max, step: scale.step, precision: scale.precision, onChange: function () { vm.onColFilterChanged(); }, translate: vm.colFilterTranslate(scale, '') };
            var pad = 8, w = 264;
            var left = rect ? rect.left : 120;
            if (left + w > window.innerWidth - pad) { left = window.innerWidth - pad - w; }
            if (left < pad) { left = pad; }
            tf.left = left;
            tf.top = (rect ? rect.bottom : 120) + 6;
            tf.show = true;
            setTimeout(function () { try { $scope.$broadcast('rzSliderForceRender'); } catch (e) { } }, 0);
        };
        vm.onColFilterChanged = function () {
            var tf = vm.thFilter;
            if (!tf.key) { return; }
            // a handle sitting at the floor/ceil means that side is OPEN (no bound) -
            // stored as null so it never excludes values, including future data that
            // grows past today's edge. both open = no filter at all.
            var loOpen = tf.min <= tf.scaleMin;
            var hiOpen = tf.max >= tf.scaleMax;
            if (loOpen && hiOpen) {
                delete vm.colFilters[tf.key];
            } else {
                vm.colFilters[tf.key] = { min: loOpen ? null : tf.min, max: hiOpen ? null : tf.max, sortMethod: tf.sortMethod, label: tf.label, mdId: tf.mdId, colIdx: tf.colIdx };
            }
            vm.applyColFilteredFlags();
            vm.filter_debounceShort();
        };
        vm.clearColumnFilter = function (key) {
            if (key == null) { return; }
            delete vm.colFilters[key];
            if (vm.thFilter.key === key) { vm.thFilter.min = vm.thFilter.scaleMin; vm.thFilter.max = vm.thFilter.scaleMax; }
            vm.applyColFilteredFlags();
            vm.filter_debounceShort();
        };
        vm.closeColumnFilter = function () { vm.thFilter.show = false; };
        // flag filtered columns so the header can show an indicator dot. A column
        // is "filtered" if it has a per-column range filter, OR - for the salary
        // column - if the Filters-dialog salary range is narrowed.
        vm.applyColFilteredFlags = function () {
            var salActive = (vm.filter_minSalary > vm.slate_minSal || vm.filter_maxSalary < vm.slate_maxSal);
            var ths = document.querySelectorAll('#salData thead th[attr-col]');
            for (var i = 0; i < ths.length; i++) {
                var k = ths[i].getAttribute('attr-col');
                var on = !!vm.colFilters[k] || (k === 'salary' && salActive);
                if (on) { ths[i].classList.add('thFiltered'); } else { ths[i].classList.remove('thFiltered'); }
            }
        };

        vm.forceTableRefresh = function () {
            vm.updateActiveFiltersText();

            if (vm.showProjections == 2) { return; }

            vm.clearCharts();
            vm.updateSalariesForSlate();
            vm.updateSortState();
            if (vm.applyColFilteredFlags) { vm.applyColFilteredFlags(); }
            if (vm.buildHiddenColList) { vm.buildHiddenColList(); }
            vm.chart_debounce();
		};
        vm.filter_debounce = LineStarUtility.debounce(vm.forceTableRefresh, 1000, $scope);
        vm.filter_debounceShort = LineStarUtility.debounce(vm.forceTableRefresh, vm.isMobileDevice ? 500 : 200, $scope);

        vm.refreshPositionFiltersState = function(){
            var items = $('.posDynamic');

            for(var i=0; i <items.length;i++){
                var itm = $(items[i]);
                var pos = itm.attr('attr-pos');

                if(vm.filter_pos != null && vm.filter_pos.PositionName == pos){
                    itm.addClass('activeFilter');
				}else{
                    itm.removeClass('activeFilter');
				}
            }
            if(vm.filter_pos == null){
                $('#posFilterALL').addClass('activeFilter');
			}else{
                $('#posFilterALL').removeClass('activeFilter');
			}
		};

        vm.filterPos = function (pos) {
            vm.filter_posList = null;
            if (pos != null) {
                var pf = vm.periodData.PositionFilters;
                for (var i = 0; i < pf.length; i++) {
                    if (pf[i].FilterText == pos) {
                        vm.filter_pos = pf[i];
                        break;
                    }
                }
            }else{
                vm.filter_pos = null;
			}

            vm.refreshPositionFiltersState();
            vm.filter_debounceShort();
		};

        vm.clearFilters = function(){
            vm.filter_pos = null;
            vm.filter_posList = null;
            vm.filter_name = null;
            vm.filter_teams = {};
            vm.filter_maxSalary = vm.slate_maxSal;
            vm.filter_minSalary = vm.slate_minSal;
            vm.filtersAreActive = false;
            vm.showOnlyExcludedPlayers = false;
            vm.showOnlyLikedPlayers = false;
            vm.showOnlyProjAdjustedPlayers = false;
            vm.showOnlyExposureAdjustedPlayers = false;
            vm.activeStatFilter = null;
            vm.activeStatFilterModel = vm.nullFilterModel;
            vm.colFilters = {};
            if (vm.applyColFilteredFlags) { vm.applyColFilteredFlags(); }

            if (vm.lineupBuilder != null && vm.lineupBuilder != undefined) {
                vm.lineupBuilder.activeSlotIdx = -1;
            }

            for(var i =0; i<vm.teamsInSlate.length; i++){
                vm.teamsInSlate[i].IsDisplayed = false;
            }

            if (vm.showStacksDialog) {
                vm.onTeamFilterChangedCallback();
            }

            // filter_name was cleared above; the proj-ce-search directive re-renders the box.
            vm.refreshPositionFiltersState();

            vm.filter_debounceShort();
        };

        // ===== Compound Filters ==============================================
        // A compound filter is a named snapshot of the currently-active filters,
        // saved PER SPORT (filters can carry sport-specific context). Create one
        // from the active-filters menu; activate one from the Filters flyout to
        // restore that whole set of filters at once.
        vm.compoundFilters = [];
        vm.compoundFiltersKey = function () {
            return 'fscCompound_' + (vm.Sport != null ? vm.Sport : (typeof LineStar !== 'undefined' ? LineStar.Sport : ''));
        };
        vm.loadCompoundFilters = function () {
            vm.compoundFilters = [];
            try {
                var raw = localStorage.getItem(vm.compoundFiltersKey());
                if (raw) { vm.compoundFilters = JSON.parse(raw) || []; }
            } catch (e) { vm.compoundFilters = []; }
        };
        vm.persistCompoundFilters = function () {
            try { localStorage.setItem(vm.compoundFiltersKey(), angular.toJson(vm.compoundFilters)); } catch (e) { }
        };
        // a serializable snapshot of every active filter
        vm.captureFilterState = function () {
            var teams = [];
            for (var tk in vm.filter_teams) {
                if (vm.filter_teams[tk]) { teams.push({ Id: vm.filter_teams[tk].Id, Name: vm.filter_teams[tk].Name }); }
            }
            var colF = {};
            try { colF = JSON.parse(angular.toJson(vm.colFilters || {})); } catch (e) { colF = {}; }
            return {
                name: vm.filter_name || null,
                posText: vm.filter_pos ? vm.filter_pos.FilterText : null,
                minSal: vm.filter_minSalary,
                maxSal: vm.filter_maxSalary,
                excluded: !!vm.showOnlyExcludedPlayers,
                liked: !!vm.showOnlyLikedPlayers,
                projAdj: !!vm.showOnlyProjAdjustedPlayers,
                expAdj: !!vm.showOnlyExposureAdjustedPlayers,
                teams: teams,
                colFilters: colF
            };
        };
        // restore a snapshot onto the live filters (starts from a clean slate so
        // the result is exactly what was saved)
        vm.applyFilterState = function (st) {
            if (!st) { return; }
            vm.clearFilters();
            vm.filter_name = st.name || null;   // proj-ce-search directive re-renders the search box from the model
            if (st.posText) { vm.filterPos(st.posText); }
            if (st.minSal != null) { vm.filter_minSalary = st.minSal; }
            if (st.maxSal != null) { vm.filter_maxSalary = st.maxSal; }
            if (vm.salarySlider) { vm.salarySlider.minValue = vm.filter_minSalary; vm.salarySlider.maxValue = vm.filter_maxSalary; }
            vm.showOnlyExcludedPlayers = !!st.excluded;
            vm.showOnlyLikedPlayers = !!st.liked;
            vm.showOnlyProjAdjustedPlayers = !!st.projAdj;
            vm.showOnlyExposureAdjustedPlayers = !!st.expAdj;
            vm.filter_teams = {};
            if (st.teams && st.teams.length && vm.teamsInSlate) {
                var want = {};
                for (var i = 0; i < st.teams.length; i++) { want[st.teams[i].Id] = st.teams[i]; }
                for (var j = 0; j < vm.teamsInSlate.length; j++) {
                    var tm = vm.teamsInSlate[j];
                    if (want[tm.Id]) { tm.IsDisplayed = true; vm.filter_teams[tm.Id] = tm; }
                }
            }
            try { vm.colFilters = JSON.parse(angular.toJson(st.colFilters || {})); } catch (e) { vm.colFilters = {}; }
            if (vm.applyColFilteredFlags) { vm.applyColFilteredFlags(); }
            vm.refreshPositionFiltersState();
            setTimeout(function () { try { $scope.$broadcast('rzSliderForceRender'); } catch (e) { } }, 0);
            vm.filter_debounceShort();
        };
        vm.createCompoundFilter = function () {
            if (!vm.activeFilterList || !vm.activeFilterList.length) { return; }
            var def = 'Filter ' + (vm.compoundFilters.length + 1);
            var name = window.prompt('Name this compound filter:', def);
            if (name == null) { return; }                       // cancelled
            name = ('' + name).trim() || def;
            vm.compoundFilters.push({
                id: 'cf_' + (new Date()).getTime() + '_' + Math.floor(Math.random() * 1000),
                name: name,
                state: vm.captureFilterState()
            });
            vm.persistCompoundFilters();
        };
        vm.activateCompoundFilter = function (cf) { if (cf) { vm.applyFilterState(cf.state); } };
        vm.deleteCompoundFilter = function (cf) {
            var idx = vm.compoundFilters.indexOf(cf);
            if (idx >= 0) { vm.compoundFilters.splice(idx, 1); vm.persistCompoundFilters(); }
        };
        vm.loadCompoundFilters();
        // =====================================================================

        vm.activeFilterList = [];

        vm.clearFilter = function (filt) {
            switch (filt.filter) {
                case 1:
                    vm.filter_pos = null;
                    vm.filter_posList = null;
                    vm.refreshPositionFiltersState();
                    break;
                case 2:
                    vm.filter_name = null;
                    break;
                case 3:
                    {
                        filt.data.IsDisplayed = false;
                        if (vm.filter_teams[filt.data.Id] != null) {
                            delete vm.filter_teams[filt.data.Id];

                            if (vm.showStacksDialog) {
                                vm.onTeamFilterChangedCallback();
                            }
                        }
                    }
                    break;
                case 4:
                    vm.filter_maxSalary = vm.slate_maxSal;
                    vm.filter_minSalary = vm.slate_minSal;
                    break;
                case 5:
                    vm.showOnlyExcludedPlayers = false;
                    break;
                case 6:
                    vm.showOnlyLikedPlayers = false;
                    break;
                case 7:
                    vm.showOnlyProjAdjustedPlayers = false;
                    break;
                case 8:
                    {
                        var lb = vm.lineupBuilder;
                        if (lb != null && lb != undefined && lb.activeSlotIdx >= 0) {
                            lb.activeSlotIdx = -1;
                        }
                    }
                    break;
                case 9:
                    break;
                case 10:
                    vm.activeStatFilter = null;
                    vm.activeStatFilterModel = vm.nullFilterModel;
                    break;
                case 11:
                    vm.showOnlyExposureAdjustedPlayers = false;
                    break;
                case 20:
                    if (filt.data != null) { delete vm.colFilters[filt.data]; vm.applyColFilteredFlags(); }
                    break;
            }
            vm.filter_debounceShort();
        };

        vm.builderSlotActive = false;

        vm.updateActiveFiltersText = function(){
            var af = [];

            vm.activeFilterList = [];

            if(vm.filter_pos != null){
                af.push("position");
                vm.activeFilterList.push({name:'Position', filter: 1});
			}
            if(vm.filter_name != null && vm.filter_name.length>0){
                af.push("name");
                vm.activeFilterList.push({ name: 'Name', filter: 2 });
			}

            for(var tk in vm.filter_teams){
                af.push(vm.filter_teams[tk].Name);
                vm.activeFilterList.push({ name: vm.filter_teams[tk].Name, filter: 3, data: vm.filter_teams[tk] });
			}

            if (vm.filter_minSalary > vm.slate_minSal || vm.filter_maxSalary < vm.slate_maxSal){
                af.push('$' + vm.filter_maxSalary);
                vm.activeFilterList.push({ name: 'Salary $' + vm.filter_minSalary + ' - $' + vm.filter_maxSalary, filter: 4 });
            }

            if (vm.showOnlyExcludedPlayers) {
                af.push('Excluded Players');
                vm.activeFilterList.push({ name: 'Excluded Players', filter: 5 });
            }
            if (vm.showOnlyLikedPlayers) {
                af.push('Liked Players');
                vm.activeFilterList.push({ name: 'Liked Players', filter: 6 });
            }
            if (vm.showOnlyProjAdjustedPlayers) {
                af.push("Projection Adjustments");
                vm.activeFilterList.push({ name: 'Projection Adjustments', filter: 7 });
            }
            if (vm.showOnlyExposureAdjustedPlayers) {
                af.push("Exposure Adjustments");
                vm.activeFilterList.push({ name: 'Exposure Adjustments', filter: 11 });
            }

            var lb = vm.lineupBuilder;
            if (lb != null && lb != undefined && lb.activeSlotIdx >= 0) {
                af.push('builder slot');
                vm.builderSlotActive = true;
                vm.activeFilterList.push({ name: 'Builder Slot', filter: 8 });
            } else {
                vm.builderSlotActive = false;
            }

            if (vm.activeStatFilter != null) {
                af.push(vm.activeStatFilter.name);
                vm.activeFilterList.push({ name: vm.activeStatFilter.name, filter: 10 });
            }

            for (var cfk in vm.colFilters) {
                var cf = vm.colFilters[cfk];
                if (!cf) { continue; }
                af.push(cf.label);
                // open bounds (null) read as "≥ min" / "≤ max"; both set = "min – max"
                var cfRange = (cf.min == null) ? ('≤ ' + cf.max) : (cf.max == null) ? ('≥ ' + cf.min) : (cf.min + ' – ' + cf.max);
                vm.activeFilterList.push({ name: cf.label + ': ' + cfRange, filter: 20, data: cfk });
            }

            if(af.length > 0){
                vm.activeFiltersText = "Active Filters: " + LineStarUtility.stringListToStr(af);
                vm.filtersAreActive = true;
			}else{
                vm.activeFiltersText = ""; 
                vm.filtersAreActive = false;
			}
		};

        vm.updateSortState = function(){
            $('th').removeClass('sortDesc').removeClass('sortAsc');
            $('th[attr-sort="' + vm.sortMethod + '"]').addClass(vm.sortDesc ? 'sortDesc' : 'sortAsc');
            vm.applySortColHighlight();
		};

        // highlight every cell in the sorted column via a container class on
        // .modules_all (CSS does the tinting) - survives row re-renders, no
        // per-cell work. The sort is keyed by attr-sort; map it to the column's
        // attr-col to pick the column to tint.
        vm.applySortColHighlight = function () {
            var el = document.querySelector('.modules_all');
            if (!el) { return; }
            var rm = [];
            for (var i = 0; i < el.classList.length; i++) { if (el.classList[i].indexOf('fscSortCol-') === 0) { rm.push(el.classList[i]); } }
            for (var j = 0; j < rm.length; j++) { el.classList.remove(rm[j]); }
            var th = document.querySelector('#salData thead th[attr-sort="' + vm.sortMethod + '"]');
            var key = th ? th.getAttribute('attr-col') : null;
            // sortMethod -1 is a matchup-data sort - no attr-sort to look up. If
            // it's one of the extra sport columns, resolve the key from the stat
            // index so it tints like every other sorted column.
            if (!key && vm.sortMethod == -1) {
                for (var k = 0; k < vm.sportExtraStats.length; k++) {
                    if (vm.isExtraStatSorted(vm.sportExtraStats[k])) { key = vm.sportExtraStats[k].key; break; }
                }
            }
            if (key) { el.classList.add('fscSortCol-' + key); }
		};

        vm.processAlerts = function(p){

            if(p.Alerts == null && p.Notes != null && p.Notes.length>0){
                p.Alerts = $.parseJSON(p.Notes);
            }
            if(p.Alerts == null || p.Alerts === undefined){
                p.Alerts = [];     
            }

            for(var i=0;i<p.Alerts.length;i++){
                var a = p.Alerts[i];

                if (a.Alert >= 31 && a.Alert <= 39) {
                    p.LU = (a.Alert - 30);
                }
                if (LineStar.Sport == 6) {
                    if (p.POS != 'G') {
                        if (a.Alert == 10 || a.Alert == 11) {
                            p.PPL = (a.Note.indexOf('#1') >= 0) ? 1 : 2;
                        }
                    }
                } else if (vm.showDepth) {
                    
                    if (a.Alert == 10 || a.Alert == 11) {
                        p.depthOrder = 1;
                        var num = str = a.Note.replace(/[^0-9]/g, "");
                        if (num != null && num.length > 0) {
                            p.depthOrder = parseInt(num);
                        }
                    }
                }

                if(a.Alert == 10){
                    p.StartingStatus = 2;//conf
				}else if(a.Alert == 11){
                    p.StartingStatus = 1;//expect        
				}
			}
		};

        vm.getColorizedCls = function(p, idx){
            return p.colorized['c' + idx];
		};

        vm.initColorizeData = function(){
            var colorizeSortMethods = [0,6,14,15,16,18,19,21,27];
            var salList = vm.salaryListForSelSlatePosProj;

            if(LineStar.Sport == 6){
                vm.colorizeHockey();
			}else if(LineStar.Sport ==3){
                vm.colorizeBaseball();     
			}

            for(var j=0;j<colorizeSortMethods.length; j++){
                var colIdx = colorizeSortMethods[j];
                var cd={};
                var i;
                var inv = 0;

                if(colIdx == 8 || colIdx == 9){
                    inv = 1;
				}

                salList.sort(function(b,a){
                    var aA = vm.getPlayerSortValue(inv ? b:a,colIdx);
                    var bB = vm.getPlayerSortValue(inv ? a:b,colIdx);

                    if(aA > bB) return 1;
                    if(aA < bB) return -1;
                    return 0;
                });

                var top10 = Math.round(salList.length*0.1);
                cd.max = vm.getPlayerSortValue(salList[top10],colIdx);
                if(top10 <= 0){
                    top10 = 1;        
				}
                cd.min = vm.getPlayerSortValue(salList[salList.length-top10],colIdx);
                
                for(i=0; i<salList.length;i++){
                    var ps = salList[i];
                    var val = vm.getPlayerSortValue(ps,colIdx);
                    if(val >= cd.max){
                        ps.colorized['c' + colIdx] = 'cellGreen';
					}else if(val <= cd.min){
                        ps.colorized['c' + colIdx] = 'cellRed';
					}else{
                        ps.colorized['c' + colIdx] = '';
					}
                }
			}
		};

        vm.colorizeBaseball = function(){
            var salList = vm.salaryListForSelSlatePosProj;
            for(i=0; i<salList.length;i++){
                var ps = salList[i];
                if(ps.LU >= 1 && ps.LU <= 5){
                    ps.colorized.c8 = 'cellGreen';
				}else if(ps.LU > 5 && ps.LU <= 9){
                    ps.colorized.c8 = 'cellRed';
				}else{
                    ps.colorized.c8 = '';
				}

                if(ps.mlbLRAdvantage == 1){
                    ps.colorized.c9 = 'cellGreen';
				}else if(ps.mlbLRAdvantage == 0){
                    ps.colorized.c9 = 'cellRed';
				}else{
                    ps.colorized.c9 = '';        
				}
            }
		};

        vm.colorizeHockey = function(){
            var salList = vm.salaryListForSelSlatePosProj;
            for(i=0; i<salList.length;i++){
                var ps = salList[i];
                if(ps.LU == 1 || ps.LU == 2){
                    ps.colorized.c8 = 'cellGreen';
				}else if(ps.LU == 3 || ps.LU == 4){
                    ps.colorized.c8 = 'cellRed';
				}else{
                    ps.colorized.c8 = '';
				}
                if(ps.PPL == 1){
                    ps.colorized.c9 = 'cellGreen';
				}else if(ps.PPL == 2){
                    ps.colorized.c9 = 'cellRed';
				}else{
                    ps.colorized.c9 = '';        
				}
            }
		};

        vm.colorizeTable = function(){
            var headerCols = $('th');
            var rows = $('tbody > tr');

            $('td').removeClass('cellRed').removeClass('cellGreen');

            for(var colIdx=0; colIdx<headerCols.length;colIdx++){
                var col = $(headerCols[colIdx]);
                var sortIdx = col.attr('attr-sort');
                if(sortIdx != null){
                    var minValue = 1000000.0;
                    var maxValue = 0.0;

                    //Get the min and max values for this Column
                    rows.each(function () {
                        var row = $(this);
                        var cell = row.children().eq(colIdx);
                        if(cell.length ==0){
                            return;              
						}
                        var txt = cell.text().replace(/\D/g,'');
                        var val = LineStarUtility.safeParseFloat(txt);

                        if(val < minValue){
                            minValue = val;
						}
                        if(val > maxValue){
                            maxValue = val;
						}
                    });

                    rows.each(function () {
                        var row = $(this);
                        var cell = row.children().eq(colIdx);
                        if(cell.length ==0){
                            return;              
						}
                        var txt = cell.text().replace(/\D/g,'');
                        var val = LineStarUtility.safeParseFloat(txt);

                        if(val >= (maxValue*0.8)){
                            //Colorize green
                            cell.addClass('cellGreen');
						}
                        if(val <= (minValue*1.2)){
                            //Colorize red
                            cell.addClass('cellRed');
						}
                    });
				}
			}
		};
        vm.colorize_debounce = LineStarUtility.debounce(vm.colorizeTable, vm.isMobileDevice ? 1000 : 200);
        
        webService.getSalaries = function (callback) {
            return $http({
                url: "/DesktopModules/DailyFantasyApi/API/Fantasy/GetSalariesV5",
                 type: "GET",
                params: {
                    "site": LineStar.Site,
                    "sport": LineStar.Sport,
                    "periodId": LineStar.PeriodId,
                }
            })
            .success(function (data) {
                callback(data);
            })
            .error(function (error) {
                console.log(error);
            });
        };

        webService.getPlayerHistory = function (callback, ps) {
            return $http({
                url: "/DesktopModules/DailyFantasyApi/API/Fantasy/GetPlayerHistoryRecentV2",
                 type: "GET",
                params: {
                    "site": LineStar.Site,
                    "sport": LineStar.Sport,
                    "playerId": ps.PID,
                    "slateMode": 0,
                }
            })
            .success(function (data) {
                callback(data);
            })
            .error(function (error) {
                console.log(error);
            });
        };

        webService.getFastUpdate = function (callback) {
            return $http({
                url: "/DesktopModules/DailyFantasyApi/API/Fantasy/GetFastUpdateV2",
                 type: "GET",
                params: {
                    "site": LineStar.Site,
                    "sport": LineStar.Sport,
                    "periodId": LineStar.PeriodId,
                }
            })
            .success(function (data) {
                callback(data);
            })
            .error(function (error) {
                console.log(error);
            });
        };

        webService.savePlayerAdjustments = function (callback, modsToSave) {
            if(LineStar.IsPremium!=1){
                vm.showtoast('You must be a premium member in order to adjust projections.');
                return;
			}

            $http({
                url: "/DesktopModules/DailyFantasyApi/API/Fantasy/UpdateCustomProjectionV3",
                method: "POST",
                headers: {
                    'Content-Type': "application/json"
                },
                data: {
                    "sport": LineStar.Sport,
                    "mods": modsToSave,
                },
            }).then(function onSuccess(response) {
                callback(response.status == 200 ? true : false, response.data);
            }).catch(function onError(response) {
                callback(false, (response.data != null) ? response.data : "An error has occured");
            });
        };

        // ── Player Groups (optimizer V4, doc §2.2) ───────────────────────────
        // "Use at least / at most / exactly / between N of these players."
        // playerIds are SALARY ids - the same `id` sent for each player in the
        // optimize payload and the same value returned in `lineup` arrays, so
        // there is nothing to translate.
        //
        // Persisted per sport+site+slate: a group of this slate's players is
        // meaningless against another slate's salary ids.
        vm.playerGroups = [];

        vm.getPlayerGroupsKey = function () {
            var slateId = (vm.selectedSlate != null) ? vm.selectedSlate.Id : 0;
            return 'optiPlayerGroups_' + vm.Sport + '_' + vm.Site + '_' + slateId;
        };

        vm.loadPlayerGroups = function () {
            vm.playerGroups = [];
            try {
                var raw = localStorage.getItem(vm.getPlayerGroupsKey());
                if (raw) { vm.playerGroups = JSON.parse(raw) || []; }
            } catch (e) { vm.playerGroups = []; }
            if (!(vm.playerGroups instanceof Array)) { vm.playerGroups = []; }
        };

        vm.savePlayerGroups = function () {
            try {
                // angular.toJson, not JSON.stringify: these are bound to an
                // ng-repeat, so Angular has stamped $$hashKey onto each one and
                // stringify would persist it
                localStorage.setItem(vm.getPlayerGroupsKey(), angular.toJson(vm.playerGroups));
            } catch (e) { }
        };

        vm.newPlayerGroup = function () {
            var g = { name: '', playerIds: [], comparator: 'atLeast', count: 1, maxCount: 1, enabled: true, ShowItem: false };
            vm.playerGroups.push(g);
            vm.savePlayerGroups();
            return g;
        };

        vm.removePlayerGroup = function (g) {
            var i = vm.playerGroups.indexOf(g);
            if (i >= 0) { vm.playerGroups.splice(i, 1); vm.savePlayerGroups(); }
        };

        vm.playerGroupComparators = [
            { v: 'atLeast', n: 'At Least' },
            { v: 'atMost',  n: 'At Most' },
            { v: 'exactly', n: 'Exactly' },
            { v: 'between', n: 'Between' }
        ];

        // "Use at least 1 of 3 players" - the summary line on the group row
        vm.playerGroupSummary = function (g) {
            if (g == null) { return ''; }
            var label = 'at least';
            for (var i = 0; i < vm.playerGroupComparators.length; i++) {
                if (vm.playerGroupComparators[i].v === g.comparator) {
                    label = vm.playerGroupComparators[i].n.toLowerCase();
                    break;
                }
            }
            var n = (g.comparator === 'between') ? (g.count + '-' + g.maxCount) : g.count;
            return 'Use ' + label + ' ' + n + ' of ' + g.playerIds.length +
                   ' player' + (g.playerIds.length === 1 ? '' : 's');
        };

        vm.togglePlayerInGroup = function (g, salId) {
            var i = g.playerIds.indexOf(salId);
            if (i >= 0) { g.playerIds.splice(i, 1); } else { g.playerIds.push(salId); }
            vm.normalizePlayerGroup(g);
            vm.savePlayerGroups();
        };

        vm.isPlayerInGroup = function (g, salId) {
            return g != null && g.playerIds.indexOf(salId) >= 0;
        };

        // Keeps a group internally consistent before it is saved or sent:
        // count can't exceed the group size, and maxCount must satisfy the
        // server's contract (>= count always; == count for the non-range
        // comparators, so the server can read [count, maxCount] uniformly).
        vm.normalizePlayerGroup = function (g) {
            if (g == null) { return; }
            var size = g.playerIds.length;

            g.count = parseInt(g.count, 10);
            if (isNaN(g.count) || g.count < 0) { g.count = 0; }
            if (size > 0 && g.count > size) { g.count = size; }

            if (g.comparator === 'between') {
                g.maxCount = parseInt(g.maxCount, 10);
                if (isNaN(g.maxCount)) { g.maxCount = g.count; }
                if (g.maxCount < g.count) { g.maxCount = g.count; }
                if (size > 0 && g.maxCount > size) { g.maxCount = size; }
            } else {
                g.maxCount = g.count;
            }
        };

        vm.onPlayerGroupChanged = function (g) {
            vm.normalizePlayerGroup(g);
            vm.savePlayerGroups();
        };

        // What actually goes on the wire. ACTIVE rules only, and only the five
        // fields the server reads - `enabled` and Angular's ShowItem/$$hashKey
        // are ours and stay here.
        vm.getActivePlayerGroupsPayload = function () {
            var out = [];
            for (var i = 0; i < vm.playerGroups.length; i++) {
                var g = vm.playerGroups[i];
                // a group with nothing in it is not a constraint, it's an
                // unfinished edit - sending it would over-constrain the solve
                if (!g.enabled || !g.playerIds.length) { continue; }
                vm.normalizePlayerGroup(g);
                out.push({
                    name: g.name || 'Group ' + (i + 1),
                    playerIds: g.playerIds.slice(),
                    comparator: g.comparator,
                    count: g.count,
                    maxCount: g.maxCount
                });
            }
            return out;
        };

        // ---- Position Stacks (OPTIMIZER_CHANGES_AND_STACKING.md §2.1) --------
        // "For each P, use at least 2 of {1B,2B,OF} from the same team."
        // A correlation rule anchored on a POSITION rather than on a team, which
        // is what makes bring-backs expressible: the anchor's opponent supplies
        // the other side.
        //
        // Keyed per sport+site+SLATE, like player groups rather than like team
        // stacks: the rules name lineup positions, and a showdown slate's
        // positions are not a main slate's.
        vm.positionStacks = [];
        vm.slatePositions = [];

        // Position stacks are keyed per SPORT+SITE, not per slate. They store
        // position names and team abbreviations - both portable across slates of
        // the same sport and site - so keying them by slate threw away a whole
        // set of rules every time you switched from one classic slate to
        // another, for no reason.
        //
        // Player groups stay per-slate and must: they store SALARY ids, which
        // only exist within one slate.
        //
        // The tradeoff is showdown, where the positions really are different
        // (CPT/FLEX). validatePositionStacksForSlate handles that: a rule whose
        // anchor is not on this slate is KEPT and marked, never silently
        // deleted and never silently sent.
        vm.getPositionStacksKey = function () {
            return 'optiPosStacks_' + vm.Sport + '_' + vm.Site;
		};

        // One-time adoption of the old per-slate rules. Without it every user
        // with saved stacks appears to lose them the moment this ships - the
        // rules would still be in localStorage, under keys nothing reads.
        vm.migratePositionStackKey = function () {
            try {
                if (localStorage.getItem(vm.getPositionStacksKey()) != null) { return; }

                var prefix = 'optiPosStacks_' + vm.Sport + '_' + vm.Site + '_';
                var best = null;
                for (var i = 0; i < localStorage.length; i++) {
                    var k = localStorage.key(i);
                    if (k == null || k.indexOf(prefix) !== 0) { continue; }

                    var raw = localStorage.getItem(k);
                    var arr = null;
                    try { arr = JSON.parse(raw); } catch (e) { continue; }
                    if (!(arr instanceof Array) || !arr.length) { continue; }

                    // most rules wins - with several slates' worth to choose
                    // from, the fullest set is the best guess at the live one
                    if (best == null || arr.length > best.length) { best = arr; }
				}

                if (best != null) { localStorage.setItem(vm.getPositionStacksKey(), angular.toJson(best)); }
			} catch (e) { }
		};

        // Which rules actually apply to the slate on screen. Runs AFTER
        // PositionFilters is rebuilt (see onSlateChanged) - before that,
        // slatePositions still describes the slate you just left.
        vm.posStacksOffSlate = 0;

        vm.validatePositionStacksForSlate = function () {
            vm.rebuildSlatePositions();
            vm.posStacksOffSlate = 0;

            var valid = {};
            for (var i = 0; i < vm.slatePositions.length; i++) { valid[vm.slatePositions[i]] = 1; }
            if (!vm.slatePositions.length) { return; }   // nothing to check against yet

            for (var r = 0; r < vm.positionStacks.length; r++) {
                var rule = vm.positionStacks[r];

                // the satisfying list drops what this slate does not have; a
                // rule that keeps at least one is still meaningful
                var keep = [];
                for (var p = 0; p < (rule.positions || []).length; p++) {
                    if (valid[rule.positions[p]] === 1) { keep.push(rule.positions[p]); }
				}
                rule.positions = keep;

                rule.notOnSlate = (valid[rule.anchorPosition] !== 1);
                if (rule.notOnSlate) { vm.posStacksOffSlate++; }
			}
		};

        vm.posStacksOffSlateStr = function () {
            var n = vm.posStacksOffSlate;
            if (!n) { return ''; }
            return n + ' rule' + (n === 1 ? '' : 's') + ' ' + (n === 1 ? 'does' : 'do') +
                   ' not apply to this slate - their anchor position is not in it. ' +
                   'They are kept, and skipped when optimizing.';
		};

        vm.loadPositionStacks = function () {
            vm.positionStacks = [];
            try {
                var raw = localStorage.getItem(vm.getPositionStacksKey());
                var arr = raw ? JSON.parse(raw) : null;
                if (arr instanceof Array) {
                    for (var i = 0; i < arr.length; i++) {
                        vm.positionStacks.push(vm.normalizePositionStack(arr[i]));
					}
				}
			} catch (e) { vm.positionStacks = []; }
		};

        vm.savePositionStacks = function () {
            try {
                // angular.toJson, not JSON.stringify: $$hashKey would be
                // persisted and then re-hydrated into an ngRepeat:dupes error
                localStorage.setItem(vm.getPositionStacksKey(), angular.toJson(vm.positionStacks));
			} catch (e) { }
		};

        // ---- anchorScope (doc §2.1) -----------------------------------------
        // Does EVERY matching anchor in the lineup have to satisfy the rule, or
        // just one?
        //
        // This matters far more than it looks. anchorPosition matches by
        // ELIGIBILITY, not by slot: on a FanDuel MLB slate "1B" matches ~20
        // players (1B, C/1B, 1B/OF, 3B/1B...), so a lineup holds several. Under
        // "all" each of them would independently demand its own N same-team
        // players, which no roster has room for - the server returns zero
        // lineups with noFeasibleLineup, every time.
        //
        // "all" is only sensible anchored on a PITCHER, where a lineup holds
        // one or two. And the SERVER'S default when the field is absent is
        // "all" - which is why every hitter-anchored rule built before this
        // field existed silently produced nothing.
        vm.POS_ANCHOR_ALL_TOKENS = { 'P': 1, 'SP': 1, 'RP': 1 };

        vm.positionStackScopes = [
            { v: 'one', n: 'one' },
            { v: 'all', n: 'every' }
		];

        vm.defaultAnchorScope = function (pos) {
            var toks = String(pos || '').toUpperCase().split(/[,\/]/);
            for (var i = 0; i < toks.length; i++) {
                if (vm.POS_ANCHOR_ALL_TOKENS[toks[i].trim()] === 1) { return 'all'; }
			}
            return 'one';
		};

        // Changing the anchor re-derives the scope, but ONLY while the user has
        // not set it themselves - switching P to 1B otherwise leaves "every"
        // behind and quietly breaks the rule.
        vm.onPosStackAnchorChanged = function (r) {
            if (r != null && !r.anchorScopeSet) {
                r.anchorScope = vm.defaultAnchorScope(r.anchorPosition);
			}
            vm.onPositionStackChanged(r);
		};

        vm.onPosStackScopeChanged = function (r) {
            if (r != null) { r.anchorScopeSet = true; }
            vm.onPositionStackChanged(r);
		};

        vm.normalizePositionStack = function (r) {
            r = r || {};
            r.anchorPosition = r.anchorPosition || '';

            // Combined tokens are no longer offered (see rebuildSlatePositions).
            // The anchor takes the FIRST part: it is deterministic, it is always
            // a value the picker can show, and it is BROADER than the combined
            // token was - so a migrated rule still fires rather than quietly
            // matching nobody.
            if (r.anchorPosition.indexOf('/') >= 0 || r.anchorPosition.indexOf(',') >= 0) {
                r.anchorPosition = vm.splitPosToken(r.anchorPosition)[0] || '';
			}
            r.comparator = r.comparator || 'atLeast';
            // 'any' is the server's documented synonym for 'one'; anything
            // unrecognised falls back to the anchor-appropriate default rather
            // than to the server's 'all', which would be the broken case.
            var sc = String(r.anchorScope || '').toLowerCase();
            if (sc === 'any') { sc = 'one'; }
            if (sc !== 'all' && sc !== 'one') { sc = vm.defaultAnchorScope(r.anchorPosition); }
            r.anchorScope = sc;
            r.anchorScopeSet = (r.anchorScopeSet === true);
            r.count = Math.max(0, parseInt(r.count, 10) || 0);
            // The satisfying positions expand rather than truncate: "C/1B" as a
            // thing that SATISFIES the stack meant "a player at either", so both
            // halves go in and the rule keeps its reach.
            r.positions = (r.positions instanceof Array) ? r.positions : [];
            if (r.positions.length) {
                var flat = [];
                for (var pi = 0; pi < r.positions.length; pi++) {
                    var parts = vm.splitPosToken(r.positions[pi]);
                    for (var pj = 0; pj < parts.length; pj++) {
                        if (flat.indexOf(parts[pj]) < 0) { flat.push(parts[pj]); }
					}
				}
                r.positions = flat;
			}
            r.from = (r.from === 'opposingTeam') ? 'opposingTeam' : 'sameTeam';
            // teamFilter is derived, not authored: picking teams means "only
            // these", picking none means any team. A rule stored under the old
            // three-way control as "exclude" has its teams CLEARED rather than
            // reinterpreted - silently flipping an exclude-list into an
            // only-list would invert the constraint without telling anyone.
            if (r.teamFilter === 'exclude') { r.teams = []; }
            r.teams = (r.teams instanceof Array) ? r.teams : [];
            r.teamFilter = r.teams.length ? 'only' : 'any';
            r.enabled = (r.enabled !== false);
            return r;
		};

        vm.newPositionStack = function () {
            var r = vm.normalizePositionStack({
                anchorPosition: vm.slatePositions.length ? vm.slatePositions[0] : '',
                comparator: 'atLeast', count: 2, positions: [], from: 'sameTeam', teamFilter: 'any'
            });
            vm.positionStacks.push(r);
            vm.savePositionStacks();
            return r;
		};

        vm.removePositionStack = function (r) {
            var i = vm.positionStacks.indexOf(r);
            if (i >= 0) { vm.positionStacks.splice(i, 1); vm.savePositionStacks(); }
		};

        vm.onPositionStackChanged = function (r) {
            vm.normalizePositionStack(r);
            vm.savePositionStacks();
		};

        vm.positionStackComparators = [
            { v: 'atLeast', n: 'At least' },
            { v: 'atMost',  n: 'At most' },
            { v: 'exactly', n: 'Exactly' }
		];
        vm.positionStackFroms = [
            { v: 'sameTeam',     n: 'the same team' },
            { v: 'opposingTeam', n: 'the opposing team' }
		];

        // SINGLE positions only. This used to offer the combined tokens too
        // ("C/1B" alongside "C" and "1B"), on the reading that they were
        // different rules - but anchorPosition matches by ELIGIBILITY, not by
        // the slot a player occupies, so "1B" already covers every C/1B,
        // 1B/OF and 3B/1B on the slate. The combined entries were a longer
        // list expressing a distinction the matcher does not make.
        //
        // UTIL/FLEX stay excluded - they are roster slots, not positions, and
        // anchoring a correlation on "any player" says nothing.
        vm.rebuildSlatePositions = function () {
            var out = [], seen = {};
            var skip = { 'UTIL': 1, 'FLEX': 1 };
            var pfs = (vm.periodData != null) ? vm.periodData.PositionFilters : null;

            for (var i = 0; pfs != null && i < pfs.length; i++) {
                var raw = String(pfs[i].PositionName || '').toUpperCase().trim();
                if (!raw.length) { continue; }

                // no [raw] in front any more: a token with no separator splits
                // to itself, so plain positions are unaffected
                var toks = raw.split(/[,\/]/);
                for (var j = 0; j < toks.length; j++) {
                    var t = toks[j].trim();
                    if (!t.length || skip[t] === 1 || seen[t] === 1) { continue; }
                    seen[t] = 1;
                    out.push(t);
				}
			}
            vm.slatePositions = out;
		};

        // ---- migrating rules saved while combined tokens were offered ----
        // A stored "C/1B" is no longer in slatePositions, and neither binding
        // fails loudly: the anchor <select> would render Angular's blank
        // unknown-option, and a chip for it simply would not appear - while the
        // value carried on being sent to the server. Both are silent, so the
        // stored rules are converted instead.
        vm.splitPosToken = function (s) {
            var out = [];
            var parts = String(s == null ? '' : s).toUpperCase().split(/[,\/]/);
            for (var i = 0; i < parts.length; i++) {
                var t = parts[i].trim();
                if (t.length && out.indexOf(t) < 0) { out.push(t); }
			}
            return out;
		};

        vm.isPosStackPosition = function (r, pos) {
            return (r != null && r.positions.indexOf(pos) >= 0);
		};

        vm.togglePosStackPosition = function (r, pos) {
            if (r == null) { return; }
            var i = r.positions.indexOf(pos);
            if (i >= 0) { r.positions.splice(i, 1); } else { r.positions.push(pos); }
            vm.onPositionStackChanged(r);
		};


        // The rule in English, which is also how the doc describes it - if this
        // reads wrong, the rule IS wrong.
        vm.positionStackSummary = function (r) {
            if (r == null || !r.anchorPosition) { return 'Not set up yet'; }

            var cmp = 'at least';
            for (var i = 0; i < vm.positionStackComparators.length; i++) {
                if (vm.positionStackComparators[i].v === r.comparator) {
                    cmp = vm.positionStackComparators[i].n.toLowerCase();
				}
			}

            var what = r.positions.length ? r.positions.join('/') : 'any position';
            var from = (r.from === 'opposingTeam') ? 'the opposing team' : 'the same team';
            var scope = (r.anchorScope === 'all') ? 'every' : 'one';
            var str = 'For ' + scope + ' ' + r.anchorPosition + ', use ' + cmp + ' ' + r.count + ' ' + what + ' from ' + from;

            if (r.teams.length) { str += ' (' + r.teams.join(', ') + ' only)'; }

            return str;
		};

        // Active = enabled AND anchored. An anchorless rule is an unfinished
        // edit, and sending it would constrain a solve against nothing.
        vm.getActivePositionStacksPayload = function () {
            var out = [];

            for (var i = 0; i < vm.positionStacks.length; i++) {
                var r = vm.positionStacks[i];
                if (!r.enabled || !r.anchorPosition) { continue; }
                // a rule whose anchor is not on this slate would match nobody -
                // sending it just makes the server work out the same thing
                if (r.notOnSlate) { continue; }
                vm.normalizePositionStack(r);

                // The rule is authored in abbreviations because that is what a
                // person reads, but the player objects carry team IDs - so send
                // both and let the solver match on ids (doc §2.1).
                var ids = [];
                for (var j = 0; j < r.teams.length; j++) {
                    var id = vm.teamIdForAbbrev(r.teams[j]);
                    if (id > 0) { ids.push(id); }
				}

                out.push({
                    anchorPosition: r.anchorPosition,
                    // always sent: the server falls back to 'all' when it is
                    // missing, which is the case that returns zero lineups
                    anchorScope: r.anchorScope,
                    comparator: r.comparator,
                    count: r.count,
                    positions: r.positions.slice(),
                    from: r.from,
                    teamFilter: r.teamFilter,
                    teams: r.teams.slice(),
                    teamIds: ids
                });
			}
            return out;
		};

        vm.teamIdForAbbrev = function (name) {
            var ts = vm.teamsInSlate || [];
            for (var i = 0; i < ts.length; i++) {
                if (ts[i].Name === name) { return ts[i].Id; }
			}
            return 0;
		};

        vm.positionStacksActive = function () {
            return vm.getActivePositionStacksPayload().length > 0;
		};

        vm.positionStacksSummaryStr = function () {
            var n = vm.getActivePositionStacksPayload().length;
            if (!n) { return 'None'; }
            return n + ' rule' + (n === 1 ? '' : 's');
		};

        // ---- pane wiring ----
        vm.optPosStacksOpen = false;

        vm.openPositionStacksPane = function () {
            vm.optSettingsOpen = false;
            vm.optModelsOpen = false;
            vm.optStacksOpen = false;
            vm.optStackOptionsOpen = false;
            vm.optStackTeamsOpen = false;
            vm.optExcludeTeamsOpen = false;
            // These three were missing: closing the panel from a Player
            // Groups or Position Stacks pane left its flag set, which kept
            // .lbMiniSettingsPinned on and the panel open.
            vm.optGroupsOpen = false;
            vm.optGroupPlayersOpen = false;
            vm.optPosStacksOpen = false;
            vm.optGroupsOpen = false;
            vm.optGroupPlayersOpen = false;
            vm.rebuildSlatePositions();
            vm.optPosStacksOpen = true;
		};

        vm.createPositionStack = function () {
            vm.rebuildSlatePositions();
            vm.newPositionStack();
		};

        // ---- Position stacks: team selection ---------------------------------
        // Reuses the team-stacks picker rather than a chip row, so both places
        // pick teams the same way, with the same stat columns and sorting.
        //
        // teamPopupSelectorMode is the file's existing discriminator for that
        // shared pane (0 = pool include/exclude, 1 = display filter, 2 = team
        // stacks); this is mode 3. The pane writes through onTeamStackingChanged
        // and onFilterAllTeams, which branch on it.
        //
        // The picker keys on team ID; the rule stores ABBREVIATIONS, per the
        // payload spec. teamsInSlate carries both, so the write-back translates.
        vm.POS_STACK_TEAM_MODE = 3;
        vm.editingPosStackRule = null;

        vm.openPosStackTeamsPane = function (r) {
            if (r == null) { return; }

            // project the rule's selection onto the shared scratch fields the
            // pane edits - the same thing showTeamStackPopup does for a stack
            var ts = vm.teamsInSlate || [];
            for (var i = 0; i < ts.length; i++) {
                ts[i].IsStacking = (r.teams.indexOf(ts[i].Name) >= 0);
                ts[i].maxExp = "0";   // no exposure in a position rule; keep the field sane
			}

            vm.editingPosStackRule = r;
            vm.showCreateStackItem = null;
            vm.teamPopupSelectorMode = vm.POS_STACK_TEAM_MODE;
            vm.dismissTooltips();

            vm.optPosStacksOpen = false;
            vm.optStackTeamsOpen = true;
		};

        // Reads the scratch fields back into the rule. Called from the shared
        // handlers below whenever a checkbox or Select all/none changes.
        vm.syncPosStackTeams = function () {
            var r = vm.editingPosStackRule;
            if (r == null) { return; }

            var out = [];
            var ts = vm.teamsInSlate || [];
            for (var i = 0; i < ts.length; i++) {
                if (ts[i].IsStacking) { out.push(ts[i].Name); }
			}
            r.teams = out;
            vm.onPositionStackChanged(r);
		};

        // Button label on the rule card.
        vm.posStackTeamsStr = function (r) {
            if (r == null || !r.teams.length) { return 'Any team'; }
            if (r.teams.length <= 3) { return r.teams.join(', '); }
            return r.teams.length + ' teams';
		};

        // ---- Named optimizer setups -----------------------------------------
        // "How I like the optimizer tuned", saved under a name the user picks.
        //
        // SCOPE is sport+site, matching how the options themselves are keyed
        // (Id_Sport_Site in saveLineGenSettings). A DraftKings salary rule
        // applied to a FanDuel slate would be wrong, not merely surprising.
        //
        // WHAT A SETUP CARRIES is decided by one question: does the value
        // survive a change of slate?
        //   in  - engine, every AdvancedOption (lineup count, exposure, liked
        //         pool, salary, randomness...), projection model, team stacks
        //         and position stacks. Team ids are league-level and position
        //         tokens are sport-level, so both re-resolve on any slate.
        //   out - player groups (salary ids are per-slate) and team
        //         include/exclude (already persisted per site+slate on its own
        //         track). Restoring either onto a different slate would apply
        //         rules to players who are not in it.
        var OPTI_CFG_MAX = 12;

        vm.optiConfigs = [];
        vm.savingOptiConfig = false;
        vm.optiConfigNameDraft = '';

        vm.getOptiConfigsKey = function () {
            return 'optiConfigs_' + vm.Sport + '_' + vm.Site;
		};

        vm.loadOptiConfigs = function () {
            vm.optiConfigs = [];
            try {
                var raw = localStorage.getItem(vm.getOptiConfigsKey());
                var arr = raw ? JSON.parse(raw) : null;
                if (arr instanceof Array) { vm.optiConfigs = arr; }
			} catch (e) { vm.optiConfigs = []; }
		};

        vm.saveOptiConfigs = function () {
            try {
                localStorage.setItem(vm.getOptiConfigsKey(), angular.toJson(vm.optiConfigs));
			} catch (e) { }
		};

        vm.captureOptiConfig = function (name) {
            var opts = [];
            var ao = (vm.periodData != null) ? vm.periodData.AdvancedOptions : null;
            for (var i = 0; ao != null && i < ao.length; i++) {
                var o = ao[i];
                opts.push({
                    id: o.Id,
                    v1: o.Val1,
                    v2: o.Val2,
                    // OptionType 5 keeps its state in PosList, not Val1
                    pos: (o.OptionType == 5 && o.PosList != null) ? angular.copy(o.PosList) : null
                });
			}

            return {
                name: name,
                ts: new Date().getTime(),
                engine: vm.usev3Opti ? 1 : 0,
                model: vm.generateModelVal,
                options: opts,
                stacks: angular.copy(vm.stackOptions || []),
                posStacks: angular.copy(vm.positionStacks || [])
			};
		};

        vm.applyOptiConfig = function (cfg) {
            vm.optiResetArmed = false;
            if (cfg == null) { return; }

            vm.usev3Opti = (cfg.engine == 1);
            vm.onV3OptiChanged();

            if (cfg.model != null) {
                vm.generateModelVal = cfg.model;
                LineStarUtility.saveSettingInt('generateModelVal_' + LineStar.Sport, cfg.model);
                vm.updateSelectedGenerateModel();
			}

            var ao = (vm.periodData != null) ? vm.periodData.AdvancedOptions : null;
            var saved = cfg.options || [];
            for (var i = 0; ao != null && i < ao.length; i++) {
                var o = ao[i];
                for (var j = 0; j < saved.length; j++) {
                    if (saved[j].id !== o.Id) { continue; }

                    o.Val1 = saved[j].v1;
                    if (saved[j].v2 != null) { o.Val2 = saved[j].v2; }
                    if (saved[j].pos != null) { o.PosList = angular.copy(saved[j].pos); }
                    // checkbox options render from Checked, not Val1
                    if (o.OptionType == 1) { o.Checked = (o.Val1 == 1 || o.Val1 === '1'); }
                    // saveLineGenSettings only writes options flagged Changed
                    o.Changed = 1;
                    break;
				}
			}
            vm.saveLineGenSettings();
            vm.updateMaxExpOnSalsDebounce();

            vm.stackOptions = angular.copy(cfg.stacks || []);
            vm.updateStacksString();
            vm.saveStackOptions();

            vm.positionStacks = [];
            var ps = cfg.posStacks || [];
            for (var k = 0; k < ps.length; k++) {
                vm.positionStacks.push(vm.normalizePositionStack(angular.copy(ps[k])));
			}
            vm.savePositionStacks();
		};

        // ---- save / delete flow ----
        vm.startSaveOptiConfig = function () {
            vm.optiConfigNameDraft = '';
            vm.savingOptiConfig = true;
		};

        vm.cancelSaveOptiConfig = function () {
            vm.savingOptiConfig = false;
            vm.optiConfigNameDraft = '';
		};

        vm.commitSaveOptiConfig = function () {
            var name = (vm.optiConfigNameDraft || '').trim();
            if (!name.length) { return; }

            var cfg = vm.captureOptiConfig(name);

            // Same name overwrites rather than making a second chip with the
            // same label - two identical chips are unusable.
            var replaced = false;
            for (var i = 0; i < vm.optiConfigs.length; i++) {
                if (String(vm.optiConfigs[i].name).toLowerCase() === name.toLowerCase()) {
                    vm.optiConfigs[i] = cfg;
                    replaced = true;
                    break;
				}
			}
            if (!replaced) {
                vm.optiConfigs.push(cfg);
                while (vm.optiConfigs.length > OPTI_CFG_MAX) { vm.optiConfigs.shift(); }
			}

            vm.saveOptiConfigs();
            vm.cancelSaveOptiConfig();
		};

        vm.onOptiConfigNameKey = function (ev) {
            if (ev == null) { return; }
            if (ev.key === 'Enter') { ev.preventDefault(); vm.commitSaveOptiConfig(); }
            if (ev.key === 'Escape') { vm.cancelSaveOptiConfig(); }
		};

        vm.deleteOptiConfig = function (cfg, ev) {
            if (ev) { ev.stopPropagation(); }
            var i = vm.optiConfigs.indexOf(cfg);
            if (i >= 0) { vm.optiConfigs.splice(i, 1); vm.saveOptiConfigs(); }
		};

        // ---- Reset to defaults ----------------------------------------------
        // The empty setup. Covers EXACTLY the surface a named setup covers, in
        // the opposite direction - so moving between a saved setup and a clean
        // slate is symmetric, and Reset can never destroy something no setup
        // could have restored.
        //
        // That is why player groups and the team include/exclude survive it:
        // they are keyed to this slate, they are deliberately outside setups,
        // and someone who spent real effort building a group should not lose it
        // to a button labelled "reset the settings".
        vm.optiResetArmed = false;

        vm.armOptiReset = function () { vm.optiResetArmed = true; };
        vm.cancelOptiReset = function () { vm.optiResetArmed = false; };

        vm.resetOptiToDefaults = function () {
            vm.optiResetArmed = false;

            // every AdvancedOption back to its server-supplied default, with the
            // per-option storage keys dropped so the reset survives a reload
            vm.initLineGenSettings(true);
            vm.updateMaxExpOnSalsDebounce();

            // the value a first-time user gets, not "off"
            vm.usev3Opti = true;
            vm.onV3OptiChanged();

            vm.generateModelVal = 0;
            LineStarUtility.saveSettingInt('generateModelVal_' + LineStar.Sport, 0);
            vm.updateSelectedGenerateModel();

            vm.stackOptions = [];
            vm.updateStacksString();
            vm.saveStackOptions();

            vm.positionStacks = [];
            vm.savePositionStacks();
		};

        // ---- Player Groups: pane wiring + the picker's list -----------------
        vm.optGroupsOpen = false;
        vm.optGroupPlayersOpen = false;
        vm.editingGroup = null;
        vm.groupPlayerFilter = '';
        vm.groupPlayerSort = 'proj';
        vm.groupPlayerList = [];

        // Matches the other pane openers: every sibling pane is closed, or two
        // detail panes render stacked and the main pane stays hidden behind
        // whichever one you back out of.
        vm.openPlayerGroupsPane = function () {
            vm.optSettingsOpen = false;
            vm.optModelsOpen = false;
            vm.optStacksOpen = false;
            vm.optStackOptionsOpen = false;
            vm.optStackTeamsOpen = false;
            vm.optExcludeTeamsOpen = false;
            // These three were missing: closing the panel from a Player
            // Groups or Position Stacks pane left its flag set, which kept
            // .lbMiniSettingsPinned on and the panel open.
            vm.optGroupsOpen = false;
            vm.optGroupPlayersOpen = false;
            vm.optPosStacksOpen = false;
            vm.optGroupPlayersOpen = false;
            vm.optGroupsOpen = true;
        };

        // The summary shown on the settings row: "2 groups" / "None".
        vm.playerGroupsSummaryStr = function () {
            var n = vm.getActivePlayerGroupsPayload().length;
            if (!n) { return 'None'; }
            return n + ' group' + (n === 1 ? '' : 's');
        };

        vm.playerGroupsActive = function () {
            return vm.getActivePlayerGroupsPayload().length > 0;
        };


        // ---- Step 2 of the settings redesign: human value strings ------------
        // Every row's value is derived from state here rather than in the
        // template, so "None" / "All 24" logic lives in one place and the
        // markup stays a binding.

        // The three options that make up Exposure limits, matched TWO ways.
        // The string Id is the key getOptiSettingsObj() files them under and is
        // what the readers use (optSettings.exposuremax etc). The numeric Option
        // ids are the pair the rest of this file already treats as the exposure
        // trio - see the updateMaxExpOnSals branch. Either match is enough, so a
        // sport or site whose payload spells one of them differently still lands
        // these three in the right pane instead of leaking them into Advanced.
        vm.EXPOSURE_OPT_IDS = ['exposuremax', 'positionexposurelevelmax', 'lovedexposure'];
        vm.EXPOSURE_OPT_NUMS = [8, 19, 10];

        vm.isExposureOpt = function (opt) {
            if (opt == null) { return false; }
            if (vm.EXPOSURE_OPT_IDS.indexOf(opt.Id) >= 0) { return true; }
            return (vm.EXPOSURE_OPT_NUMS.indexOf(opt.Option) >= 0);
		};
        vm.getExposureOpts = function () {
            var out = {};
            var opts = (vm.periodData != null) ? vm.periodData.AdvancedOptions : null;
            if (opts == null) { return out; }
            for (var i = 0; i < opts.length; i++) {
                if (vm.isExposureOpt(opts[i])) { out[opts[i].Id] = opts[i]; }
			}
            return out;
		};

        // "Max 60%", plus a tail when the other two exposure controls are also
        // in play - per-position caps and the liked-player override are easy to
        // set and then forget, and the row is the only place they surface now.
        vm.exposureSummaryStr = function () {
            var e = vm.getExposureOpts();
            var parts = [];

            var max = e.exposuremax;
            parts.push('Max ' + (max != null ? LineStarUtility.ensureNumeric(max.Val1) : 0) + '%');

            var pos = e.positionexposurelevelmax;
            if (pos != null && pos.PosList != null && pos.PosList.length > 0) {
                parts.push(pos.PosList.length + ' by position');
			}

            var loved = e.lovedexposure;
            if (loved != null && loved.Val1 == 1) {
                parts.push('liked 100%');
			}

            return parts.join(' · ');
		};

        vm.exposureChanged = function () {
            var e = vm.getExposureOpts();
            var pos = e.positionexposurelevelmax;

            // OptionType 5 carries its state in PosList, not Val1, so the
            // Val1 != Value1 test the other two use can't see it
            if (pos != null && pos.PosList != null && pos.PosList.length > 0) { return true; }

            for (var i = 0; i < vm.EXPOSURE_OPT_IDS.length; i++) {
                var o = e[vm.EXPOSURE_OPT_IDS[i]];
                if (o != null && o.OptionType != 5 && o.Val1 != o.Value1) { return true; }
			}
            return false;
		};

        // The Advanced badge must NOT count the exposure options - they have
        // their own row now, and counting them in both places tells the user
        // they changed twice as much as they did.
        vm.advancedChangedCount = function () {
            var cnt = 0;
            var opts = (vm.periodData != null) ? vm.periodData.AdvancedOptions : null;
            if (opts == null) { return 0; }
            for (var i = 0; i < opts.length; i++) {
                var o = opts[i];
                // 102 (lineup count) and 17 (liked pool) are excluded for the
                // same reason as the exposure trio: each has a row of its own,
                // and counting them here would report the change twice.
                if (o.Val1 != o.Value1 && o.Option != 17 && o.Option != 102 && !vm.isExposureOpt(o)) { cnt++; }
			}
            return cnt;
		};



        // ---- Optimize duration estimate, learned from this user's own runs ---
        // There is no timing model to borrow: how long an optimize takes depends
        // on the pool, the engine, the rules AND the machine, so the only honest
        // source is what this user's last few runs actually cost.
        //
        // Keyed per sport+site+slate mode, matching how stacks and groups key -
        // a showdown slate and a main slate are not the same workload, and a
        // rate learned on one would mislead on the other.
        var OPTI_RATE_MAX_SAMPLES = 8;
        var OPTI_RATE_MIN_SAMPLES = 2;   // one run is an anecdote, not a rate

        vm.optiRateKey = function () {
            var mode = (vm.selectedSlate != null) ? vm.selectedSlate.Mode : 'x';
            return 'optirate_' + LineStar.Sport + '.' + LineStar.Site + '.' + mode;
		};

        vm.loadOptiRates = function () {
            try {
                var raw = localStorage.getItem(vm.optiRateKey());
                var arr = raw ? JSON.parse(raw) : null;
                return (arr instanceof Array) ? arr : [];
			} catch (e) { return []; }
		};

        // Samples are {n: lineups produced, ms: elapsed}. Storing both rather
        // than a pre-divided rate keeps a 5-lineup run from carrying the same
        // weight as a 150-lineup one if we ever want to weight them.
        vm.pushOptiRate = function (n, ms) {
            if (!(n > 0) || !(ms > 0)) { return; }
            try {
                var arr = vm.loadOptiRates();
                arr.push({ n: n, ms: ms });
                while (arr.length > OPTI_RATE_MAX_SAMPLES) { arr.shift(); }
                localStorage.setItem(vm.optiRateKey(), JSON.stringify(arr));
			} catch (e) { }
		};

        // MEDIAN per-lineup rate, not mean: one run that hit a slow server or a
        // backgrounded tab would drag a mean for the next eight optimizes.
        vm.optiMsPerLineup = function () {
            var arr = vm.loadOptiRates();
            if (arr.length < OPTI_RATE_MIN_SAMPLES) { return 0; }

            var rates = [];
            for (var i = 0; i < arr.length; i++) {
                if (arr[i] && arr[i].n > 0 && arr[i].ms > 0) { rates.push(arr[i].ms / arr[i].n); }
			}
            if (rates.length < OPTI_RATE_MIN_SAMPLES) { return 0; }

            rates.sort(function (a, b) { return a - b; });
            var mid = Math.floor(rates.length / 2);
            return (rates.length % 2) ? rates[mid] : (rates[mid - 1] + rates[mid]) / 2;
		};

        // '' until there is something real to say - a made-up number here is
        // worse than no number, because people plan around it.
        vm.optiDurationStr = function () {
            var rate = vm.optiMsPerLineup();
            if (rate <= 0) { return ''; }

            var n = parseFloat(vm.getLineGenSetting(102));
            if (!(n > 0)) { return ''; }

            var secs = Math.round((rate * n) / 1000);
            if (secs < 5) { return 'a few sec'; }
            if (secs < 90) { return '~' + (Math.round(secs / 5) * 5) + ' sec'; }

            var mins = secs / 60;
            return '~' + (mins < 10 ? (Math.round(mins * 2) / 2) : Math.round(mins)) + ' min';
		};

        // One watch rather than instrumenting each site: optimizingLineups is
        // set in five places across the V4 and classic paths, and a new one
        // would silently stop being measured.
        var optiRunStart = 0, optiRunN = 0;
        $scope.$watch(function () { return vm.optimizingLineups; }, function (nv, ov) {
            if (nv === ov) { return; }

            if (nv == 1) {
                optiRunStart = (window.performance && performance.now) ? performance.now() : new Date().getTime();
                optiRunN = parseFloat(vm.getLineGenSetting(102)) || 0;
                return;
			}

            if (!optiRunStart) { return; }
            var now = (window.performance && performance.now) ? performance.now() : new Date().getTime();
            var ms = now - optiRunStart;
            optiRunStart = 0;

            // Streaming knows how many lineups actually arrived, which makes a
            // STOPPED run a usable sample instead of a poisoned one - it cost
            // that long for that many. Classic is one-shot, so the requested
            // count is the produced count.
            var produced = parseFloat(vm.optiStreamCount) || optiRunN;

            // Floors and ceilings for the obviously-not-a-measurement cases: an
            // instant failure, or a tab left backgrounded mid-run.
            if (ms < 250 || ms > 10 * 60 * 1000) { return; }
            vm.pushOptiRate(produced, ms);
		});
        // ---- Lineups to build: slider + typed count + quick picks -----------
        // The option's own RangeMin/RangeMax are not always populated (this is
        // why the old stepper carried data-min/data-max as a backstop), so the
        // bounds are resolved here and every commit goes through them. 150 is
        // the ceiling the stepper used and the one the server accepts.
        vm.LINEUP_QUICK_PICKS = [10, 20, 50, 100, 150];

        vm.lineupCountMin = function () {
            var o = vm.lineupCountOpt;
            var v = (o != null) ? parseFloat(o.RangeMin) : NaN;
            return (isFinite(v) && v > 0) ? v : 1;
		};

        vm.lineupCountMax = function () {
            var o = vm.lineupCountOpt;
            var v = (o != null) ? parseFloat(o.RangeMax) : NaN;
            return (isFinite(v) && v > 0) ? Math.min(v, 150) : 150;
		};

        // Filtered against the resolved bounds rather than shown flat: a short
        // slate can cap below 150, and a button whose value the commit would
        // immediately clamp is a button that appears not to work.
        vm.lineupQuickPicks = function () {
            var lo = vm.lineupCountMin(), hi = vm.lineupCountMax();
            var out = [];
            for (var i = 0; i < vm.LINEUP_QUICK_PICKS.length; i++) {
                var n = vm.LINEUP_QUICK_PICKS[i];
                if (n >= lo && n <= hi) { out.push(n); }
			}
            return out;
		};

        // The single commit path - typing, dragging and the quick picks all end
        // here. onOptValChanged clamps too, but only against RangeMin/RangeMax,
        // which is exactly the pair that can be missing.
        vm.commitLineupCount = function () {
            var o = vm.lineupCountOpt;
            if (o == null) { return; }

            var v = Math.round(parseFloat(o.Val1));
            if (!isFinite(v)) { v = vm.lineupCountMin(); }   // emptied the field
            v = Math.max(vm.lineupCountMin(), Math.min(vm.lineupCountMax(), v));

            o.Val1 = v;
            vm.onOptValChanged(o);   // clamp again against the option, then save
		};

        vm.setLineupCount = function (n) {
            var o = vm.lineupCountOpt;
            if (o == null) { return; }
            o.Val1 = n;
            vm.commitLineupCount();
		};

        vm.isLineupCount = function (n) {
            var o = vm.lineupCountOpt;
            return (o != null && LineStarUtility.ensureNumeric(o.Val1) == n);
		};

        // Enter commits the typed value the same way tabbing away does - without
        // this the field sits in an edited-but-uncommitted state that looks
        // saved (the number is right there) but isn't.
        vm.onLineupCountKey = function (ev) {
            if (ev != null && ev.key === 'Enter') { ev.target.blur(); }
		};

        // The trigger's badge: everything the panel would show as changed, as
        // one number. Advanced contributes its own count because those really
        // are N separate options; every other row contributes 1, since "team
        // stacks" is a single decision however many teams sit inside it.
        //
        // Deliberately mirrors the rows that light up .optRowChanged - if the
        // badge says 3, exactly three rows are highlighted when you open it.
        vm.optiChangedCount = function () {
            var cnt = vm.advancedChangedCount();

            var lc = vm.lineupCountOpt;
            if (lc != null && lc.Val1 != lc.Value1) { cnt++; }
            if (vm.excludedTeamCnt > 0) { cnt++; }
            if (vm.likedPlayerPoolOpt != null && vm.likedPlayerPoolOpt.Val1 == 1) { cnt++; }
            if (vm.generateModelVal != 0) { cnt++; }
            if (vm.stacksAreEnabled) { cnt++; }
            if (vm.playerGroupsActive()) { cnt++; }
            if (vm.exposureChanged()) { cnt++; }

            return cnt;
		};

        // ══ Optimizer settings tabs ═══════════════════════════════════════════
        // The list outgrew its card - roughly 800px of content against an 84vh
        // cap, which overflows on a laptop. Four tabs split it by what the
        // setting DOES, with Lineups to build, Engine and the setup controls
        // left outside because they apply to the whole run rather than to one
        // group.
        //
        // Each tab carries a badge counting its own non-default settings. That
        // is not decoration: splitting a settings list is exactly what makes
        // "what have I changed?" hard to answer, and without the badges you
        // would have to visit all four tabs to find out.
        vm.OPT_TABS = [
            { key: 'pool',   label: 'Player pool' },
            { key: 'rules',  label: 'Rules' },
            { key: 'stacks', label: 'Stacking' },
            { key: 'adv',    label: 'Advanced' }
		];

        vm.optTab = 'pool';
        try {
            var savedTab = localStorage.getItem('fscOptTab');
            if (savedTab) { vm.optTab = savedTab; }
		} catch (e) { }

        vm.setOptTab = function (key) {
            vm.optTab = key;
            try { localStorage.setItem('fscOptTab', key); } catch (e) { }

            // Advanced renders OptimizerOptionsList INLINE, and that helper is
            // shared with the Exposure pane through showOnlyExpSettings. Leaving
            // the flag at 1 after backing out of Exposure would make this tab
            // show the exposure options instead of the advanced ones.
            if (key === 'adv') { vm.showOnlyExpSettings = 0; }
		};

        // ---- per-tab changed counts ----
        // One memoized pass for all four rather than four walks: the tab strip
        // asks for every badge on every digest, and advancedChangedCount alone
        // walks the whole AdvancedOptions list.
        vm._tabChgSig = null;
        vm._tabChg = { pool: 0, rules: 0, stacks: 0, adv: 0 };

        vm.optTabChangedSig = function () {
            return vm.excludedTeamCnt + '|' + vm.generateModelVal + '|' + vm.optiProjSource + '|' +
                   (vm.stacksAreEnabled ? 1 : 0) + '|' + (vm.playerGroupsActive() ? 1 : 0) + '|' +
                   (vm.positionStacksActive() ? 1 : 0) + '|' + (vm.exposureChanged() ? 1 : 0) + '|' +
                   vm.builderLockedCount() + '|' + vm.advancedChangedCount() + '|' +
                   (vm.count_removed || 0) + '|' +
                   ((vm.likedPlayerPoolOpt != null) ? vm.likedPlayerPoolOpt.Val1 : 0);
		};

        vm.optTabChanged = function (key) {
            var sig = vm.optTabChangedSig();
            if (sig !== vm._tabChgSig) {
                vm._tabChgSig = sig;

                var pool = 0;
                if (vm.builderLockedCount() > 0) { pool++; }
                if (vm.excludedTeamCnt > 0) { pool++; }
                if (vm.likedPlayerPoolOpt != null && vm.likedPlayerPoolOpt.Val1 == 1) { pool++; }
                if ((vm.count_removed || 0) > 0) { pool++; }

                var rules = 0;
                if (vm.optiProjSource !== 'linestar') { rules++; }
                if (vm.generateModelVal != 0) { rules++; }
                if (vm.exposureChanged()) { rules++; }

                var stacks = 0;
                if (vm.stacksAreEnabled) { stacks++; }
                if (vm.positionStacksActive()) { stacks++; }
                if (vm.playerGroupsActive()) { stacks++; }

                vm._tabChg = { pool: pool, rules: rules, stacks: stacks, adv: vm.advancedChangedCount() };
			}
            return vm._tabChg[key] || 0;
		};

        // ---- excluded players, as a pool row ----
        // The list already exists and is maintained live (vm.excludedPlayers,
        // vm.count_removed) - it was only ever surfaced in the filters area,
        // nowhere the optimizer could see it. Same remove path the filters
        // chips use: resetMaxExp restores the default exposure, which is what
        // re-includes a player.
        vm.optExcludedOpen = false;

        vm.openExcludedPlayersPane = function () {
            vm.dismissTooltips();
            vm.closeOptimizerPanes();
            vm.optExcludedOpen = true;
		};

        vm.closeExcludedPlayersPane = function () {
            vm.dismissTooltips();
            vm.optExcludedOpen = false;
		};

        vm.excludedPlayerCount = function () { return vm.count_removed || 0; };

        vm.unexcludePlayer = function (p) {
            if (p == null) { return; }
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a premium LineStar member to do this.');
                return;
			}
            vm.resetMaxExp(p);
		};

        // Backing out of Exposure has to clear the flag too, or the Advanced tab
        // renders the exposure subset - the two share one helper.
        vm.closeAdvancedPane = function () {
            vm.optSettingsOpen = false;
            vm.showOnlyExpSettings = 0;
		};

        // The line under the Optimize button: what this run will actually do,
        // assembled from the same state the rows read rather than restated, so
        // the two can't drift. Sentence-case fragments joined by a middot.
        //
        // Only the engine and the team pool are unconditional - those two are
        // always true of a run. Everything else earns its place by being ON, so
        // a default setup reads "V4 engine · all 24 teams · max 60%" instead of
        // a queue of "none"s.
        vm.optiFooterSummary = function () {
            var parts = [];

            parts.push(vm.usev3Opti ? 'V4 engine' : 'Classic engine');

            // "All 24" / "18 of 24" -> "all 24 teams" / "18 of 24 teams"
            if (vm.teamsSummaryStr) {
                parts.push(String(vm.teamsSummaryStr).toLowerCase() + ' teams');
			}

            if (vm.generateModelVal != 0 && vm.generateModel != null && vm.generateModel.Name) {
                parts.push(vm.generateModel.Name);
			}

            var st = vm.stacksSummaryStr();
            if (st && st !== 'None') { parts.push(String(st).toLowerCase()); }

            var pg = vm.getActivePlayerGroupsPayload().length;
            if (pg > 0) { parts.push(pg + ' group' + (pg === 1 ? '' : 's')); }

            if (vm.likedPlayerPoolOpt != null && vm.likedPlayerPoolOpt.Val1 == 1) {
                parts.push('liked players only');
			}

            var e = vm.getExposureOpts();
            if (e.exposuremax != null) {
                parts.push('max ' + LineStarUtility.ensureNumeric(e.exposuremax.Val1) + '%');
			}

            return parts.join(' · ');
		};

        // "4-3 stack" rather than the raw "4-3-0" the three fixed slots produce.
        // Sizes only - "4-3 stack" rather than the raw "4-3-0" the three fixed
        // slots produce. The team count used to ride along here, but which
        // teams are stacked is the drill-down's job; the row answers "is
        // stacking on, and how big".
        vm.stacksSummaryStr = function () {
            var o = vm.stackOptions;
            if (o == null) { return 'None'; }

            var sizes = [];
            for (var i = 0; i < o.length; i++) {
                if (o[i].enabled) { sizes.push(o[i].stackSize); }
			}
            if (sizes.length === 0) { return 'None'; }

            return sizes.join('-') + ' stack';
		};

        // Advanced and Exposure limits are the SAME pane, filtered two ways by
        // showOnlyExpSettings - identical controls, disjoint subsets, different
        // title. Which is why both doors set the flag explicitly: whichever was
        // opened last would otherwise decide what the next one shows.
        vm.openAdvancedPane = function () {
            vm.showOnlyExpSettings = 0;
            vm.openOptimizerSettingsPane();
		};

        vm.openExposurePane = function () {
            vm.showOnlyExpSettings = 1;
            vm.openOptimizerSettingsPane();
		};

        vm.createPlayerGroup = function () {
            var g = vm.newPlayerGroup();
            vm.showGroupPlayersPane(g);   // straight into picking - an empty group does nothing
        };

        // Count dropdown options. Bounded by the group's own size, because
        // "at least 5 of 3 players" can never be satisfied - normalizePlayerGroup
        // clamps it anyway, but offering it at all is a trap.
        vm.playerGroupCountRange = function (g) {
            var max = (g && g.playerIds.length) ? g.playerIds.length : 1;
            var out = [];
            for (var i = 0; i <= max; i++) { out.push(i); }
            return out;
        };

        vm.showGroupPlayersPane = function (g) {
            vm.optPosStacksOpen = false;
            vm.editingGroup = g;
            vm.groupPlayerFilter = '';
            vm.optSettingsOpen = false;
            vm.optModelsOpen = false;
            vm.optStacksOpen = false;
            vm.optGroupsOpen = false;
            vm.optGroupPlayersOpen = true;
            vm.rebuildGroupPlayerList();
        };

        vm.closeGroupPlayersPane = function () {
            // the count may now exceed the selection, so re-clamp on the way out
            if (vm.editingGroup) { vm.onPlayerGroupChanged(vm.editingGroup); }
            vm.optGroupPlayersOpen = false;
            vm.optGroupsOpen = true;
        };

        vm.setGroupPlayerSort = function (mode) {
            vm.groupPlayerSort = mode;
            vm.rebuildGroupPlayerList();
        };

        vm.onGroupPlayerFilterChanged = function () {
            vm.rebuildGroupPlayerList();
        };

        // Position filter for the picker: holds a PositionFilters ENTRY (the
        // same objects the toolbar's position segment uses), or null for all.
        vm.groupPlayerPos = null;

        // Sort modes. 'team' is alphabetical with a projection tiebreak; the
        // rest are plain numeric descending on one field, since bigger is the
        // interesting end for every one of them.
        vm.GROUP_SORTS = [
            { id: 'proj',  label: 'Proj',   field: 'UserPP' },
            { id: 'value', label: 'Value',  field: 'VAL' },
            { id: 'sal',   label: 'Salary', field: 'SAL' },
            { id: 'own',   label: 'pOwn',   field: 'Owned' },
            { id: 'team',  label: 'Team',   field: null }
		];

        vm.groupSortField = function (id) {
            for (var i = 0; i < vm.GROUP_SORTS.length; i++) {
                if (vm.GROUP_SORTS[i].id === id) { return vm.GROUP_SORTS[i].field; }
			}
            return 'UserPP';
		};

        vm.setGroupPlayerPos = function (pf) {
            vm.groupPlayerPos = pf;
            vm.rebuildGroupPlayerList();
		};

        // Hidden for sports whose slate has a single position (golf, MMA) -
        // a filter offering one choice is furniture.
        vm.groupPosFiltersUsable = function () {
            var pf = (vm.periodData != null) ? vm.periodData.PositionFilters : null;
            return (pf != null && pf.length > 1);
		};

        // Built once per filter/sort change rather than through an ng-repeat
        // filter: the full slate list is long, and a filter expression would
        // re-run it on every digest.
        vm.rebuildGroupPlayerList = function () {
            var src = vm.salaryListForSelSlateALL || [];
            var q = (vm.groupPlayerFilter || '').trim().toLowerCase();

            // PositionName is the matchable form ("PG/SG"); FilterText is the
            // label. doesPositionMatch splits the PLAYER's POS itself, so this
            // only has to split the filter's side.
            var pf = vm.groupPlayerPos;
            var posArr = (pf != null && pf.PositionName != null) ? pf.PositionName.split(/[,\/]/) : null;

            var out = [];
            for (var i = 0; i < src.length; i++) {
                var ps = src[i];

                if (posArr != null && !vm.doesPositionMatch(ps.POS || '', posArr)) { continue; }

                if (q) {
                    var name = LineStarUtility.removeDiacritics(ps.Name || '').toLowerCase();
                    var team = (ps.PTEAM || '').toLowerCase();
                    if (name.indexOf(q) < 0 && team.indexOf(q) < 0) { continue; }
				}
                out.push(ps);
			}

            if (vm.groupPlayerSort === 'team') {
                out.sort(function (a, b) {
                    var t = String(a.PTEAM || '').localeCompare(String(b.PTEAM || ''));
                    // within a team, best projection first - the useful order
                    return t !== 0 ? t : (parseFloat(b.UserPP) || 0) - (parseFloat(a.UserPP) || 0);
                });
			} else {
                var f = vm.groupSortField(vm.groupPlayerSort);
                out.sort(function (a, b) { return (parseFloat(b[f]) || 0) - (parseFloat(a[f]) || 0); });
			}

            // Selected players are pinned to the top so a group stays reviewable
            // once it's built - otherwise checking what you picked means
            // scrolling a 500-row list hunting for ticks.
            var g = vm.editingGroup;
            if (g) {
                out.sort(function (a, b) {
                    var sa = vm.isPlayerInGroup(g, a.Id) ? 0 : 1;
                    var sb = vm.isPlayerInGroup(g, b.Id) ? 0 : 1;
                    return sa - sb;
                });
			}

            vm.groupPlayerList = out;
		};

        // ── Optimizer V4: NDJSON streaming ───────────────────────────────────
        // HOST NAMES ARE REVERSED. dev.betfully.com is PRODUCTION; app.
        // betfully.com is the dev/test box. The buffered call below already points at
        // dev. for the same reason - don't "fix" it.
        //
        // The streaming behaviour is selected by the PATH, not by a query
        // param: /OptimizeStream always streams. (optimizerVersion=1 used to be
        // the selector and is now inert everywhere, so don't debug against it.)
        // §1.1 and the §3 checklist both call for ?optimizerVersion=1 on the
        // optimize POST. An earlier correction said the param had gone inert
        // and the path alone selected streaming - the updated doc reasserts it,
        // and it is harmless either way, so we send it.
        //
        // The CANCEL post goes to the BARE url with no param (§1.4).
        vm.OPTI_STREAM_URL = 'https://app.betfully.com/OptimizeStream';
        vm.OPTI_STREAM_POST_URL = vm.OPTI_STREAM_URL + '?optimizerVersion=1';

        // A UUID tagging the run so it can be cancelled server-side. randomUUID
        // needs a secure context and isn't in older Safari, hence the fallback.
        vm.newOptiJobId = function () {
            try {
                if (window.crypto && crypto.randomUUID) { return crypto.randomUUID(); }
            } catch (e) { }
            return 'job-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        };

        // Fire-and-forget cancel. Goes to the BARE endpoint with no query
        // param. Aborting the fetch alone also stops the solver (broken
        // connection), but this is the deterministic path and gives the server
        // a clean cancellation log - so we do both.
        webService.cancelOptimizeV4 = function (jobId) {
            if (!jobId) { return; }
            try {
                fetch(vm.OPTI_STREAM_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cancel: true, jobId: jobId })
                }).catch(function () { });
            } catch (e) { }
        };

        // Streams lineups as they solve. handlers:
        //   onLineup(idArray)   one finished lineup, as SALARY ids
        //   onBatch(lineups)    legacy one-shot {"lineups":[...]} - server ran v0
        //   onIssue(message)    in-band {"error"} - NOT terminal, see below
        //   onEnd(result)       { status, count, requested, issues, received, truncated }
        //   onFail(message)     transport died with no terminal line
        //
        // Deliberately NOT $http: it resolves once with the whole body, so it
        // cannot stream. This reads the body incrementally - fetch +
        // getReader() + TextDecoder, split on \n, leftover buffer for a partial
        // line - which is the web row of the doc's §1.3 table and the thing
        // that actually makes it stream.
        //
        // Accept: application/x-ndjson is REQUIRED, not decoration. We dropped
        // it once (over-applying the "no Accept-Encoding" correction, which is
        // about a header browsers are forbidden from sending anyway) and the
        // server answered with the legacy {"lineups":[...]} v0 body - a
        // different SHAPE, not a buffered stream. Content negotiation is the
        // obvious explanation. It is also CORS-safelisted, so it does not add
        // a preflight.
        // `lateSwap` (optional, §3) turns this into a batch re-optimize: the
        // body carries the already-built lineups with their per-slot locks and
        // the server fills only the open slots. Everything else about the call -
        // endpoint, headers, NDJSON contract, cancel - is identical, which is
        // why it is a parameter here and not a second client.
        webService.optimizeLineupsV4Stream = function (players, settings, jobId, handlers, abortSignal, lateSwap) {
            var received = 0;
            var ended = false;
            // Diagnostics: tells apart "the server sent one buffered blob" from
            // "we streamed but rendered late" - the two causes that both look
            // like 0 lineups then all of them at once. Toggle with
            // localStorage.setItem('optiStreamDebug','1').
            var dbg = false;
            try { dbg = (localStorage.getItem('optiStreamDebug') === '1'); } catch (e) { }
            var t0 = Date.now();
            var chunks = 0;
            var lastErrorCode = null;   // carried onto the terminal result
            function log() {
                if (!dbg) { return; }
                var a = ['[opti +' + (Date.now() - t0) + 'ms]'];
                for (var i = 0; i < arguments.length; i++) { a.push(arguments[i]); }
                console.log.apply(console, a);
            }

            function end(res) {
                if (ended) { return; }
                ended = true;
                handlers.onEnd(res);
            }

            // Parse one NDJSON line and branch on which key is present.
            function handleLine(text) {
                var line = text.trim();
                if (!line) { return; }

                var obj;
                try { obj = JSON.parse(line); } catch (e) { return; }   // partial/garbage line

                if (obj.lineup) {
                    received++;
                    if (received === 1 || received % 10 === 0) { log('lineup #' + received); }
                    // entryId is present only on a late-swap line and is how the
                    // result finds its way back to the lineup it came from
                    handlers.onLineup(obj.lineup, obj.entryId);
                    return;
                }

                // a per-entry failure: the batch continues, this one entry does
                // not come back (§3.4). Recorded against its id so the summary
                // can name it rather than just come up short.
                if (obj.entryId && obj.error) {
                    if (handlers.onEntryError) { handlers.onEntryError(obj.entryId, obj.error); }
                    return;
                }
                if (obj.lineups) {                 // legacy one-shot batch
                    // DECISIVE: the server did not stream at all
                    log('LEGACY ONE-SHOT BATCH of ' + obj.lineups.length + ' - server did not stream');
                    handlers.onBatch(obj.lineups);
                    end({ status: 'done', count: obj.lineups.length, requested: obj.lineups.length,
                          issues: [], received: obj.lineups.length, truncated: false });
                    return;
                }
                if (obj.status) {                  // terminal
                    log('terminal', obj.status, 'count=' + obj.count, 'received=' + received, 'chunks=' + chunks);
                    var count = (obj.count != null) ? obj.count : received;
                    end({
                        status: obj.status,
                        count: count,
                        requested: (obj.requested != null) ? obj.requested : count,
                        issues: obj.issues || [],
                        received: received,
                        // the server's count is authoritative; a mismatch means
                        // the connection dropped mid-stream
                        truncated: (count !== received),
                        errorCode: lastErrorCode
                    });
                    return;
                }
                if (obj.error) {
                    // NOT terminal and NOT necessarily fatal: the solver can
                    // throw mid-run after lineups were already delivered, and a
                    // status:"done" with a partial count still follows. So this
                    // is reported and we keep reading - the run is judged failed
                    // only if the terminal count is 0.
                    // errorCode is the newer companion to error (errors doc §2).
                    // Nothing switches on it yet - the catalog is still server-owned
                    // and unpublished - but carrying it means a future special-case
                    // needs no re-plumbing.
                    if (obj.errorCode) { lastErrorCode = obj.errorCode; }
                    handlers.onIssue(obj.error);
                }
            }

            return fetch(vm.OPTI_STREAM_POST_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/x-ndjson'
                },
                body: JSON.stringify(function () {
                    var b = { players: players, settings: settings, stream: true, jobId: jobId };
                    // omitted entirely on a normal run rather than sent empty -
                    // its presence is what selects the mode
                    if (lateSwap != null) { b.lateSwap = lateSwap; }
                    return b;
				}()),
                signal: abortSignal
            }).then(function (resp) {
                // Response identity, for handing to whoever owns the endpoint.
                // Content-Type is the decisive bit: application/x-ndjson means
                // the streaming handler answered and any lateness is buffering;
                // application/json means the v0 handler answered and no client
                // change can help.
                log('POST', vm.OPTI_STREAM_POST_URL);
                log('status', resp.status,
                    'content-type=' + (resp.headers.get('content-type') || '(none)'),
                    'content-length=' + (resp.headers.get('content-length') || '(none)'),
                    'content-encoding=' + (resp.headers.get('content-encoding') || '(none)'),
                    'transfer-encoding=' + (resp.headers.get('transfer-encoding') || '(none)'));

                if (!resp.ok) { throw new Error('Optimizer returned ' + resp.status); }
                if (!resp.body || !resp.body.getReader) { throw new Error('Streaming unsupported'); }

                var reader = resp.body.getReader();
                var decoder = new TextDecoder();
                var buf = '';

                function pump() {
                    return reader.read().then(function (r) {
                        if (r.done) {
                            // flush whatever is left, then decide
                            if (buf.length) { handleLine(buf); buf = ''; }
                            // no terminal line = dropped connection, not success
                            if (!ended) { handlers.onFail('The optimizer connection ended unexpectedly.'); }
                            return;
                        }

                        // stream:true - a chunk can split a line mid-character,
                        // so the decoder and the buffer both have to carry over
                        chunks++;
                        // if this logs ONCE, late, with the whole payload, the
                        // response was buffered upstream - not a client problem
                        log('chunk #' + chunks, r.value.length + ' bytes');
                        buf += decoder.decode(r.value, { stream: true });

                        var nl;
                        while ((nl = buf.indexOf('\n')) >= 0) {
                            handleLine(buf.slice(0, nl));
                            buf = buf.slice(nl + 1);
                        }

                        return pump();
                    });
                }

                return pump();
            });
        };

        webService.optimizeLineupsBuffered = function (callback, players, settings) {
            var returns = 0;

            return $http({
                url: "https://dev.betfully.com/optimize",
                method: "POST",
                headers: {
                    'Content-Type': "application/json"
                },
                crossDomain: true,
                cache: false,
                withCredentials: false,
                data: {
                    players: players,
                    settings: settings
                }
            }).then(function onSuccess(response) {
                returns++;
                callback(response.status == 200 ? true : false, response.data);
            }).catch(function onError(response) {
                if (returns++ == 0) {
                    vm.showtoast('There was an error while attempting to optimize lineups.');
                    callback(false, (response.data != null) ? response.data : "An error has occured");
                }
            });
        };

        webService.optimizeLineups = function (callback, ignoreTeams, players, optModel, options, reqs, stacks, swapData) {
            if(LineStar.IsPremium!=1){
                vm.showtoast('You must be a premium member in order to optimize lineups.');
                return;
            }
            return $.ajax({
                url: "/DesktopModules/DailyFantasyApi/API/Fantasy/GenerateLineup",
                type: "POST",
                data: {
                    Sport: LineStar.Sport,
                    Site: LineStar.Site,
                    PeriodId: LineStar.PeriodId,
                    SlateId: vm.selectedSlate.Id,
                    IngoreTeams: ignoreTeams,
                    Players: players,
                    Method: optModel,
                    Options: options,
                    Reqs: reqs,
                    Stacks: stacks,
                    LocalSetId: (swapData != null) ? swapData.LocalSetId : 0,
                    SwapAllowDupes: (swapData != null) ? swapData.SwapAllowDupes : true,
                    SwapOnlyUnlocked: (swapData != null) ? swapData.SwapOnlyUnlocked : true,
                    SwapDeleteSet: (swapData != null) ? swapData.SwapDeleteSet : true,
                },
                dataType: "json",
            })
            .success(function (data) {
                vm.optimizingLineups = 0;
                callback(data);
            })
            .error(function (error) {
                console.log(error);
                vm.optimizingLineups = 0;
                vm.showtoast('There was an error while attempting to optimize lineups.');
                callback(null);
            });
        };
                
        webService.saveLineupSet = function (callback, set) {
            if(LineStar.IsPremium!=1){
                vm.showtoast('You must be a premium member in order to save lineup sets.');
                return;
			}
            if(set.saving > 0 || set.needsSave <= 0){
                return;     
			}

            set.saving = 1;
            var jsonSet = vm.jsonifySet(set);
            return $.ajax({
                url: "/DesktopModules/DailyFantasyApi/API/Fantasy/SaveLineupSet",
                type: "POST",
                data: jsonSet,
                dataType: "json",
            })
            .success(function (data) {
                set.saving = 0;
                if(data == "OK"){
                    set.needsSave = 0;
                    set.remote = 1;
                }
                callback(data);
            })
            .error(function (error) {
                set.saving = 0;
                console.log(error);
            });
        };

        webService.deleteLineupSet = function (callback, set) {
            if(LineStar.IsPremium!=1){
                vm.showtoast('You must be a premium member in order to delete lineup sets.');
                return;
			}

            var si = set.SetInfo;
            return $http({
                url: "/DesktopModules/DailyFantasyApi/API/Fantasy/DeleteLineupSet",
                type: "GET",
                contentType: "application/json",
                params: {
                    'sport': si.Sport,
                    'periodId': si.PeriodId,
                    'setId': si.LocalId,
                    'siteId': si.Site,
                }
            })
            .success(function (data) {
                callback(data);
            })
            .error(function (error) {
                console.log(error);
                vm.showtoast('There was a problem deleting the set.');
            });
        };
        
        webService.saveLineupSetName = function (callback, set) {
            var si = set.SetInfo;
            return $http({
                url: "/DesktopModules/DailyFantasyApi/API/Fantasy/UpdateLineupSetName",
                type: "GET",
                params: {
                    "site": si.Site,
                    "sport": si.Sport,
                    "periodId": si.PeriodId,
                    "setId": si.LocalId,
                    "setName": si.SetName,
                }
            })
            .success(function (data) {
                callback(data);
            })
            .error(function (error) {
                console.log(error);
            });
        };

        webService.saveOverrideProj = function (ovr, callback) {
            return $http({
                url: "/DesktopModules/DailyFantasyApi/API/Fantasy/SaveOverrideProj",
                type: "GET",
                params: {
                    "sportId": LineStar.Sport,
                    "periodId": LineStar.PeriodId,
                    "playerId": ovr.PlayerId,
                    "gameId": ovr.GameId,
                    "projection": ovr.Projection
                }
            })
                .success(function (data) {
                    callback(data);
                })
                .error(function (error) {
                    alert('Failed to save Override for player: ' + ovr.PlayerId);
                });
        };

        webService.saveOverride = function (ovr, callback) {
            return $http({
                url: "/DesktopModules/DailyFantasyApi/API/Fantasy/SaveOverride",
                 type: "GET",
                params: {
                    "sportId": LineStar.Sport,
                    "periodId": LineStar.PeriodId,
                    "playerId": ovr.PlayerId,
                    "gameId": ovr.GameId,
                    "value": ovr.Percentage
                }
            })
            .success(function (data) {
                callback(data);
            })
            .error(function (error) {
                alert('Failed to save Override for player: ' + ovr.PlayerId);
            });
        };

        webService.getOverrides = function (callback) {
            return $http({
                url: "/DesktopModules/DailyFantasyApi/API/Fantasy/GetOverrides",
                 type: "GET",
                params: {
                    "sportId": LineStar.Sport,
                    "periodId": LineStar.PeriodId,
                }
            })
            .success(function (data) {
                callback(data);
            })
            .error(function (error) {
                console.log(error);
            });
        };

        vm.doFastUpdate = function(){
            webService.getFastUpdate(function(data) {
                if(data == null) {return;}
                var changes = 0;
                var ref = 0;
                var gameDict = {};
                var updateDict = {};

                for(var i=0; i<data.Games.length;i++){
                    gameDict[data.Games[i].Id] = data.Games[i];
				}

                for (var i = 0; i < data.Items.length; i++) {
                    var r = data.Items[i];

                    for(var sk in vm.salariesPerSlate){
                        var salDict = vm.salariesPerSlate[sk];
                        var ps = salDict[r.SID];
                        if(ps == null || ps === undefined){
                            continue;           
					    }
                        if(ps.ActiveVariantId != r.VID){
                            continue;              
						}

                        var game = gameDict[ps.GID];
                        var status = ps.SS;
                        if(game != null){
                            status = game.ScoreStatus;
						}

                        if (ps.SS != status) {
                            ps.SS = status;
                            changes++;
                        }
                        if (r.CC > ps.MessageCount) {
                            ps.MessageCount = r.CC;
                        }
         
                        if (ps.PS != r.S) {
                            ps.PS = r.S;
                            changes++;
                        }

                        if (ps.PP != r.P) {
                            var diff = (ps.PP - r.P);

                            if(r.P > 1 && ps.PP == 0){
                                ref++;        
							}

                            ps.PP = r.P;

                            if(!ps.ProjLocked){
                                ps.UserPP = r.P;
							}

                            if(updateDict[ps.Id] == null || updateDict[ps.Id] == undefined){
                                var verb = (diff < 0) ? "increased" : "decreased";
                                var cls = (diff < 0) ? "flashIncrease" : "flashDecrease";

                                diff = Math.abs(diff);
                                if (diff >= 1) {
                                    updateDict[ps.Id] = ps;
                                    vm.showtoast(ps.Name + "'s projection " + verb + " by " + diff.toFixed(1) + " to " + ps.PP, 1);
                                    changes++;

                                    $('#proj_' + ps.Id).addClass(cls);
                                  
                                    setTimeout(function(psToClear){
                                        $('#proj_' + psToClear.Id).removeClass('flashIncrease flashDecrease');
                                    }, 10000, ps);
                                }
                            }
                        }
                    }
                }

                if(ref>0){
                    vm.showRefreshAlertMsg = true;
				}

                vm.updateDynamicInfo();

                if (data.PeriodComplete) {
                    clearInterval(vm.watchTimer);
                    vm.watchTimer = 0;
                }
			});
		};
        vm.watchTimer = setInterval(vm.doFastUpdate, 30000);
        vm.chartsPopulated = [];

        // ---- chart fetch queue: at most CHART_FETCH_MAX history requests in
        // flight at once (card view can put 6+ charts in view at a time; without
        // this they all fired together). Entries whose host is no longer visible
        // when their turn comes are dropped without spending a request - the
        // next populate pass re-queues them if they ever scroll back in.
        vm.CHART_FETCH_MAX = 1;
        vm.chartFetchActive = 0;
        vm.chartFetchQueue = [];

        vm.pumpChartFetchQueue = function () {
            while (vm.chartFetchActive < vm.CHART_FETCH_MAX && vm.chartFetchQueue.length > 0) {
                var entry = vm.chartFetchQueue.shift();
                if (!LineStarUtility.elementScrolled(entry.chartEle)) {
                    entry.ps.chartDataLoading = 0;
                    entry.chartEle.empty();
                    continue;
                }
                vm.chartFetchActive++;
                (function (en) {
                    var done = function () {
                        vm.chartFetchActive--;
                        vm.pumpChartFetchQueue();
                    };
                    webService.getPlayerHistory(function (data) {
                        en.ps.chartData = data;
                        en.ps.chartDataLoading = 0;
                        en.chartEle.empty();
                        en.render(data);
                        en.chartEle.addClass('chartPopulated');
                        vm.chartsPopulated.push(en.chartEle);
                        done();
                    }, en.ps).error(function () {
                        // .success(cb) never fires on http errors - unstick the
                        // slot and let a later pass retry this player
                        en.ps.chartDataLoading = 0;
                        en.chartEle.empty();
                        done();
                    });
                })(entry);
            }
        };

        vm.populateChartForEle = function(ele){
            var chartEle = ele.find('.playerChartArea');
            var isPopulated = chartEle.hasClass('chartPopulated');
            if(isPopulated){
                return;     
			}

            var row = ele;//.parents('tr');
            var pid = parseInt(row.attr('data-playerid'));
            var sid = parseInt(row.attr('data-salaryid'));

            var salDict = vm.salariesPerSlate[vm.selectedSlate.Id];
            var ps = salDict[sid];

            if(ps.chartDataLoading==1){
                return;
			}

            // 0-projected players (usually inactive/irrelevant) don't auto-fetch
            // chart history - a screenful of dead cards would burn api calls.
            // Render a manual "Load chart" button instead; clicking it (delegated
            // .chartLoadBtn handler below) flags the player and re-runs this
            // loader. Once loaded, the normal cache/eviction path applies.
            if (ps.chartData == null && ps.chartRequested != 1 && !(parseFloat(ps.UserPP) > 0) && !(parseFloat(ps.PP) > 0)) {
                if (!chartEle.hasClass('chartManual')) {
                    chartEle.addClass('chartManual');
                    chartEle.html('<span class="chartLoadBtn" role="button" tabindex="0">Not projected, but tap to load chart</span>');
                }
                vm.populateAlertHtml(ps, ele.find('.playerAlertArea'));
                vm.populateMacthupDataHtml(ps, ele.find('.playerMatchupArea'));
                return;
            }
            chartEle.removeClass('chartManual');

            // V2 chart selection — when window.FSC_CHART_V2 is on (set by
            // the Chart V1/V2 toggle in the page header, persisted in
            // localStorage), route through FSCChartsV2.prepareChart()
            // instead of V1's prepareChartDataForPlayer(). Both share the
            // same arg shape so the dispatch is a one-liner. V1 stays as
            // the default fallback.
            var renderChartForPs = function (data) {
                if (window.FSC_CHART_V2 && typeof FSCChartsV2 !== 'undefined') {
                    FSCChartsV2.prepareChart(vm.salaryContainer, pid, data, chartEle, ps, 0);
                } else {
                    prepareChartDataForPlayer(vm.salaryContainer, pid, data, chartEle, ps, 0);
                }
            };

            if(ps.chartData==null){
                // staggered: enqueue instead of fetching directly - the pump keeps
                // at most CHART_FETCH_MAX history requests in flight. Setting
                // chartDataLoading here also dedupes re-entries while queued.
                ps.chartDataLoading = 1;
                chartEle.html('<div class="playerLoadAnim"><div class="lds-ripple"><div></div><div></div></div><br>Loading data</div>');
                vm.chartFetchQueue.push({ ps: ps, chartEle: chartEle, render: renderChartForPs });
                vm.pumpChartFetchQueue();
			}else{
                renderChartForPs(ps.chartData);
                chartEle.addClass('chartPopulated');
                vm.chartsPopulated.push(chartEle);
			}

            vm.populateAlertHtml(ps, ele.find('.playerAlertArea'));
            vm.populateMacthupDataHtml(ps, ele.find('.playerMatchupArea'));
        };

        // manual chart load for 0-projected players (see populateChartForEle).
        // Delegated: the button is jQuery-injected html, not Angular-compiled.
        // stopPropagation so a click in the table doesn't also toggle row expand.
        // ---- page-wide wheel forwarding ------------------------------------
        // The board scrolls inside .tableWrapper, so the wheel only did anything
        // with the pointer over the table itself. Land on the toolbar, the hero,
        // the filter row or the empty margin beside a docked builder and it did
        // nothing - which reads as the page being stuck.
        //
        // Rather than enumerate what to exclude, this walks up from whatever is
        // under the pointer and asks whether ANY ancestor can actually scroll in
        // the wheel's direction. If one can, we bail and the browser handles it
        // natively - so the builder dock, the chat panel, dropdowns, flyouts and
        // every dialog keep scrolling themselves with no list to maintain, and
        // nothing breaks when a new scroll region is added later.
        //
        // Only the vertical wheel is claimed; deltaX is left alone so the games
        // strip and the charts keep their horizontal scroll.
        vm.wireWheelForwarding = function () {
            // one listener per page, not per controller instantiation
            if (window._fscWheelFwd) { return; }
            window._fscWheelFwd = 1;

            function scrollableAncestor(node, dy) {
                while (node && node.nodeType === 1) {
                    var oy = window.getComputedStyle(node).overflowY;
                    if (oy === 'auto' || oy === 'scroll') {
                        // "can scroll" means room left THIS way - an element
                        // already at its bottom shouldn't swallow a further
                        // scroll down
                        if (dy > 0) {
                            if (node.scrollHeight - node.clientHeight - node.scrollTop > 1) { return node; }
                        } else if (node.scrollTop > 1) {
                            return node;
                        }
                    }
                    node = node.parentElement;
                }
                return null;
            }

            document.addEventListener('wheel', function (e) {
                // ctrlKey = pinch zoom on a trackpad; a horizontal wheel is not ours
                if (e.ctrlKey || !e.deltaY) { return; }

                var tgt = e.target;
                if (!tgt || !tgt.closest) { return; }

                // cheap early out for the overwhelmingly common case - pointer
                // already over the board, so the browser does the right thing
                // and we never pay for the walk below
                if (tgt.closest('.tableWrapper')) { return; }

                // A dialog, sheet, mega nav or chat panel is up. These overlays
                // cover the page, so the pointer is inside one of them whether
                // it's over the panel or the scrim - scrolling the board behind
                // would be wrong either way.
                if (tgt.closest('.popupFullPanel, .fscSheetWrap, .fscMega, .fscMegaScrim, .fscMegaSheet, .chatPopup, .fscpopup')) { return; }

                var tw = document.querySelector('.tableWrapper');
                // offsetParent null = display:none, i.e. not the visible view
                if (!tw || tw.offsetParent === null) { return; }

                if (scrollableAncestor(tgt, e.deltaY)) { return; }

                var px = e.deltaY;
                // deltaMode 1 = lines, 2 = pages - same normalisation the
                // scroll-intent directive uses, or a line-scrolling mouse
                // would crawl
                if (e.deltaMode === 1) { px *= 16; }
                else if (e.deltaMode === 2) { px *= (tw.clientHeight || 400); }

                tw.scrollTop += px;
                // non-passive purely for this: without it the page behind can
                // rubber-band while the board scrolls
                e.preventDefault();
            }, { passive: false });
        };

        vm.wireWheelForwarding();

        $(document).on('click', '.chartLoadBtn', function (e) {
            e.stopPropagation();
            var host = $(this).closest('.projCard, .playerExtraRow');
            if (!host.length) { return; }
            var sid = parseInt(host.attr('data-salaryid'));
            var salDict = vm.salariesPerSlate[vm.selectedSlate.Id];
            var ps = (salDict != null) ? salDict[sid] : null;
            if (ps == null) { return; }
            ps.chartRequested = 1;
            host.find('.playerChartArea').removeClass('chartManual').empty();
            vm.populateChartForEle(host);
        });

        vm.populateMacthupDataHtml = function(ps, ele){
            ele.empty();

            var html = '';
            var hiddenCards = [];
            var pmd = vm.periodData.MatchupData;
            var dark = document.documentElement.getAttribute('data-fsc-theme') === 'dark';
            for(var idx = 0; idx<pmd.length; idx++){
                var md = pmd[idx];
                var item = ps.MatchupData[idx];
                if(item != null){
                    // user-hidden cards (Settings > Visuals, or the x on the card)
                    // are collected and shown as a horizontal restore list below
                    if (vm.isMatchupCardHidden && vm.isMatchupCardHidden(md.Id)) {
                        hiddenCards.push(md);
                        continue;
                    }
                    var tableBeingSorted = (vm.matchupDataSorter == md);
                    var cls = tableBeingSorted ? 'matchupTableMini matchupTableMiniSel' : 'matchupTableMini';

                    // full name as a native tooltip - the title text
                    // ellipsizes when the card is narrower than the name
                    var safeName = String(md.Name).replace(/"/g, '&quot;');
                    // header band takes the category's avg color - the same
                    // one the in-row matchupEle block shows, so the card and
                    // its block read as the same thing. Passed as custom
                    // props: the base title bg is transparent!important, so
                    // the CSS tinted rule consumes these at equal importance.
                    var tcol = vm.avgMatchupColor(item.Ranks, dark);
                    html += '<div class ="' + cls + '" data-mid="' + md.Id + '" data-sid="' + item.SID + '"><div class="matchupTableMiniTitle matchupTitleTinted" style="--muTitleBg:' + tcol.bg + ';--muTitleFg:' + tcol.fg + '"><span class="matchupTableMiniTitleText" title="' + safeName + '">' + md.Name + '</span><span class="matchupCardHide" data-mid="' + md.Id + '" role="button" title="Hide this card">&times;</span></div>';
                    for(var i=0; i < item.Values.length; i++){
                        cls = (tableBeingSorted && vm.matchupDataSorterColIdx == i) ? 'matchupTableMiniRow matchupTableMiniRowSel' : 'matchupTableMiniRow';
                        var fOn = vm.colFilters['mu:' + md.Id + ':' + i] ? ' isOn' : '';
                        var fLbl = (md.Name + ': ' + md.Columns[i]).replace(/"/g, '&quot;');
                        html += '<div class="' + cls + '"><div class="matchupTableMiniName">' + md.Columns[i] + '</div><div class="matchupTableMiniValue matchupRank' + item.Ranks[i] + '">' + item.Values[i] + '</div><span class="matchupTableMiniFilter' + fOn + '" data-mid="' + md.Id + '" data-col="' + i + '" data-label="' + fLbl + '" title="Filter by ' + fLbl + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4-2v-4z"/></svg></span></div>';

				    }
                    html += '</div>';
			    }
            }
            // EXPERIMENTAL (revertable): hidden cards become a horizontal list of
            // chips - tap a chip to restore that one card - instead of a single
            // "+N hidden" pill that restored them all at once.
            if (hiddenCards.length > 0) {
                html += '<div class="matchupHiddenList">';
                for (var hi = 0; hi < hiddenCards.length; hi++) {
                    var hmd = hiddenCards[hi];
                    var hSafe = String(hmd.Name).replace(/"/g, '&quot;');
                    html += '<span class="matchupHiddenChip" data-mid="' + hmd.Id + '" role="button" tabindex="0" title="Restore ' + hSafe + '"><span class="matchupHiddenChipName">' + hmd.Name + '</span><span class="matchupHiddenChipAdd" aria-hidden="true">+</span></span>';
                }
                html += '</div>';
            }
            ele.html(html);
		};

        vm.popuplateMiniAlertImages = function(ps){
            // memo: per-row binding, runs every digest - the alerts array is
            // compared by REFERENCE (data refreshes replace it)
            if (ps._maRef === ps.Alerts && ps._maStars === ps.Stars && ps._maAsStars === vm.showAlertsAsStars) {
                return ps._maHtml;
            }
            var html = '';
            if(vm.showAlertsAsStars){
                for(var i=0; i < 5; i++){
                    if(ps.Stars >= (i+1)){
                        html += '<span class="star"></span>';
                    }else if(ps.Stars >= (i+0.5)){
                        html += '<span class="starHalf"></span>';
                    }else{
                        html += '<span class="starNone"></span>';
					}
				}
			}
            else{
                if (ps.Alerts != null) {
                    for (var i = 0; i < ps.Alerts.length; i++) {
                        var alert = ps.Alerts[i];
                        if(alert.Alert == 10||alert.Alert == 11 ||(alert.Alert >= 31 &&alert.Alert <= 39)){continue;}
                        var alertImageName = vm.alertImg[alert.Alert];
                        html += '<span class="miniAlert" style="background-image:url(/Portals/0/images/alerts/' + alertImageName + '.svg);"></span>';
                    }
                }
            }
            ps._maRef = ps.Alerts;
            ps._maStars = ps.Stars;
            ps._maAsStars = vm.showAlertsAsStars;
            ps._maHtml = html;
            return html;
		};

        vm.populateAlertHtml =function(ps, ele){
            ele.empty();
            var alertHtml = '<div class="playerAlertsWrap">';
            if (ps.Alerts != null) {
                for (var i = 0; i < ps.Alerts.length; i++) {
                    alertHtml += vm.fscPopupGetAlertHtml(ps, ps.Alerts[i]);
                }
            }
            alertHtml += '</div>';
            ele.html(alertHtml);
		};

        vm.fscPopupGetAlertHtml = function(salary, alert) {
            var alertImageName = vm.alertImg[alert.Alert];
            var imageDesc = vm.alertTip[alert.Alert];
            if (alert.Alert == 12) {
                alertImageName = vm.injuryImgArr[salary.IS];
                imageDesc = "Injury";
            }
            return '<div class="fscPopupAlert"><img src="/Portals/0/images/alerts/' + alertImageName + '.svg" alt="' + imageDesc + '" title="' + alert.Note + '"><span class="fscPopupAlertText">' + alert.Note + '</span></div>';
        }

        vm.clearCharts = function () {
            for (var i = 0; i < vm.chartsPopulated.length; i++) {
                var itm = vm.chartsPopulated[i];
                itm.removeClass('chartPopulated');
                itm.empty();
                var parent = itm.parent().parent();
                parent.find('.playerAlertArea').empty();
                parent.find('.playerMatchupArea').empty();
            }
            vm.chartsPopulated = [];
        };

        // Re-render every currently-open chart from cached data. Invoked
        // by the V1/V2 chart-style toggle (see fscSetChartVersion in
        // ProjectionsLayout_New.cshtml) so flipping the switch updates
        // already-expanded player rows in-place rather than requiring
        // re-expand. clearCharts() resets state; populateCharts() then
        // re-mounts charts for whichever player rows remain on-screen.
        vm.refreshAllCharts = function () {
            vm.clearCharts();
            vm.populateCharts();
        };

        // next chunk of the salary list. The scroll pass in populateCharts
        // normally does this when the sentinel row comes into view, but it is
        // also the sentinel's tap handler: if the page loads with the row
        // already on screen (tall viewport = no scroll event ever fires) the
        // auto-load can deadlock on "Loading..." - tapping is the way out.
        vm.loadMoreSalaries = function () {
            var len = vm.hiddenSalariesForSlate.length;
            if (len <= 0) { return; }
            var items = vm.hiddenSalariesForSlate.splice(0, (len >= 20) ? 20 : len);
            vm.salaryListForSelSlate = vm.salaryListForSelSlate.concat(items);
            vm.chart_debounce();   // keeps loading while the sentinel stays visible
        };

        // ng-init hook on the sentinel row: whenever it (re)renders - initial
        // load, slate change, filter change - run a delayed visibility pass so
        // an already-on-screen sentinel starts loading without any scrolling.
        vm.kickLoadMore = function () {
            setTimeout(function () { vm.populateCharts(); }, 250);
        };

        // ---- rAF-paced chart render queue: cached charts render at most
        // ~8ms per frame instead of a whole screenful synchronously in one
        // long frame (the hitch felt at scroll-stop). The fetch queue
        // (network) stays separate and unchanged.
        vm._chartRenderQueue = [];
        vm._chartRenderScheduled = false;
        vm.pumpChartRenderQueue = function () {
            vm._chartRenderScheduled = false;
            var t0 = performance.now();
            while (vm._chartRenderQueue.length && (performance.now() - t0) < 8) {
                var host = vm._chartRenderQueue.shift();
                if (!host.isConnected) { continue; }
                vm.populateChartForEle($(host));
            }
            if (vm._chartRenderQueue.length && !vm._chartRenderScheduled) {
                vm._chartRenderScheduled = true;
                requestAnimationFrame(vm.pumpChartRenderQueue);
            }
        };
        vm.queueChartRender = function (host) {
            // ultra density renders no card charts (CSS hides .pcChart)
            if (vm.densityMode == 'ultra' && host.classList && host.classList.contains('projCard')) { return; }
            if (vm._chartRenderQueue.indexOf(host) >= 0) { return; }
            vm._chartRenderQueue.push(host);
            if (!vm._chartRenderScheduled) {
                vm._chartRenderScheduled = true;
                requestAnimationFrame(vm.pumpChartRenderQueue);
            }
        };
        vm.unloadChartHost = function (hostEl) {
            var $host = $(hostEl);
            var chartEle = $host.find('.playerChartArea');
            if (!chartEle.length || !chartEle.hasClass('chartPopulated')) { return; }
            chartEle.removeClass('chartPopulated');
            chartEle.empty();
            $host.find('.playerAlertArea').empty();
            $host.find('.playerMatchupArea').empty();
            for (var i = 0; i < vm.chartsPopulated.length; i++) {
                if (vm.chartsPopulated[i][0] === chartEle[0]) { vm.chartsPopulated.splice(i, 1); break; }
            }
        };

        // ---- IntersectionObserver-driven visibility: hosts report entering
        // the pre-render band (render) / leaving the wide keep band (unload)
        // by themselves - scrolling does no scanning at all. populateCharts
        // only attaches observers to hosts it hasn't seen yet.
        vm._chartIO = null;
        vm._chartUnloadIO = null;
        vm._chartIORoot = undefined;   // undefined = never built; null = viewport
        vm.ensureChartObservers = function () {
            if (typeof IntersectionObserver === 'undefined') { return; }

            // ROOT MATTERS. The rows and cards scroll inside .tableWrapper
            // (overflow:auto), not the document. With the default root the
            // observer measures against the viewport, and rootMargin expands
            // only THAT rect - clipping by an intervening scroll container is
            // not expanded with it. So a host a few pixels past the wrapper's
            // edge counted as "not intersecting" no matter how wide the keep
            // band was, and the 150% hysteresis below did nothing: nudge a
            // chart off the bottom of the table and it unloaded, scroll back
            // and it re-rendered. Pointing root at the wrapper makes the
            // margins mean what they say - and the percentages now resolve
            // against the wrapper's height rather than the viewport's.
            var root = document.querySelector('.tableWrapper') || null;
            if (vm._chartIO && vm._chartIORoot === root) { return; }

            if (vm._chartIO) {
                // rebuilding against a different root: the old observers are
                // dropped, so every host has to be handed to the new pair
                vm._chartIO.disconnect();
                vm._chartUnloadIO.disconnect();
                var known = document.querySelectorAll('.playerExtraRow, .projCard');
                for (var k = 0; k < known.length; k++) { known[k]._fscChartObs = 0; }
            }
            vm._chartIORoot = root;

            vm._chartIO = new IntersectionObserver(function (entries) {
                for (var i = 0; i < entries.length; i++) {
                    var el = entries[i].target;
                    el._fscVis = entries[i].isIntersecting ? 1 : 0;   // populateCharts re-kicks visible hosts after clearCharts
                    if (el._fscVis) { vm.queueChartRender(el); }
                }
            }, { root: root, rootMargin: '50% 0px 50% 0px' });
            // Keep band: charts survive two container-heights past either edge
            // before being torn down, so ordinary scrolling back and forth
            // never re-renders one. Raising this trades memory for stability.
            vm._chartUnloadIO = new IntersectionObserver(function (entries) {
                for (var i = 0; i < entries.length; i++) {
                    if (!entries[i].isIntersecting) { vm.unloadChartHost(entries[i].target); }
                }
            }, { root: root, rootMargin: '200% 0px 200% 0px' });
        };

        vm.populateCharts = function(){
            LineStarUtility.measureStart();
            vm.ensureChartObservers();
            if (vm._chartIO) {
                // prune entries whose host left the DOM (view switches destroy
                // rows/cards; no IO leave event fires for removed nodes)
                for (var ci = vm.chartsPopulated.length - 1; ci >= 0; ci--) {
                    var ce = vm.chartsPopulated[ci][0];
                    if (!ce || !ce.isConnected) { vm.chartsPopulated.splice(ci, 1); }
                }
                // IO mode: observe new hosts; also re-queue known-visible ones
                // (cheap - the queue dedupes and populateChartForEle skips
                // already-populated charts) so clearCharts/refreshAllCharts
                // repopulate without waiting for a scroll.
                var ioHostSel = vm.cardsChartless() ? '.playerExtraRow' : '.playerExtraRow, .projCard';
                var ioHosts = document.querySelectorAll(ioHostSel);
                for (var hi = 0; hi < ioHosts.length; hi++) {
                    var h = ioHosts[hi];
                    if (!h._fscChartObs) {
                        h._fscChartObs = 1;
                        vm._chartIO.observe(h);
                        vm._chartUnloadIO.observe(h);
                    } else if (h._fscVis) {
                        vm.queueChartRender(h);
                    }
                }
                if (LineStarUtility.elementScrolled2($('#showMoreSalariesRow'))) {
                    if (vm.hiddenSalariesForSlate.length > 0) {
                        $scope.$apply(function () { vm.loadMoreSalaries(); });
                    }
                }
                return;
            }
            // ---- fallback (no IntersectionObserver): batched scan ----

            // Hysteresis: render charts a little BEFORE they scroll into view
            // (smooth), but only unload once they're FAR away. The old exact
            // in-view test unloaded a chart 1px off-screen, so tiny scroll
            // jiggles re-rendered charts (and re-fetched alerts/matchup)
            // constantly - the main source of scroll sluggishness. The rect
            // check is native (getBoundingClientRect) instead of the jQuery
            // :visible + offset() combo, which was two layout reads per
            // element per pass.
            var vpH = window.innerHeight || 800;
            var renderMargin = vpH * 0.5;
            var unloadMargin = vpH * 1.5;
            var near = function (el, margin) {
                var r = el.getBoundingClientRect();
                if (!r.width && !r.height) { return false; }   // hidden host
                return (r.top <= vpH + margin) && (r.bottom >= -margin);
            };

            // READ phase, then WRITE phase: interleaving rect reads with DOM
            // writes (spinner injection, chart unloads) invalidates layout
            // between every element, forcing the browser to re-layout for
            // each read - batching all reads first turns N layouts into one.
            var keep = [], drop = [], i;
            for(i=0;i<vm.chartsPopulated.length;i++){
                var itm = vm.chartsPopulated[i];
                (near(itm[0], unloadMargin) ? keep : drop).push(itm);
			}
            // expanded table rows AND card-mode cards both host a .playerChartArea
            // (cards carry the same data-playerid/-salaryid attrs the loader reads).
            // Chart-less card modes (ultra everywhere; compact on mobile) hide the
            // card charts in CSS, so skip cards there - no point queueing fetches.
            var chartHostSel = vm.cardsChartless() ? '.playerExtraRow' : '.playerExtraRow, .projCard';
            var hosts = [];
            $(chartHostSel).each(function(){
                if(near(this, renderMargin)){ hosts.push(this); }
            });
            var moreVisible = LineStarUtility.elementScrolled2($('#showMoreSalariesRow'));

            // WRITE phase
            vm.chartsPopulated = keep;
            for(i=0;i<drop.length;i++){
                var gone = drop[i];
                gone.removeClass('chartPopulated');
                gone.empty();
                var parent = gone.parent().parent();
                parent.find('.playerAlertArea').empty();
                parent.find('.playerMatchupArea').empty();
			}
            for(i=0;i<hosts.length;i++){
                vm.populateChartForEle($(hosts[i]));
			}

            if (moreVisible) {
                if (vm.hiddenSalariesForSlate.length > 0) {
                    $scope.$apply(function () { vm.loadMoreSalaries(); });
                }
            }
        };

        vm.filterSets = function (lineup, arg1, arg2, arg3, arg4) {
            /*if (set.teamFilter == null || set.teamFilter == undefined) {
                set.teamFilter = [];
            }*/
            return true;
        };

        vm.setExpFilterIsEnabled = function (set, teamExp) {

            return (set.teamFilter == teamExp.Team.Id);
        };

        vm.filterSetTeamExposure = function (set, teamExp) {
            set.teamFilter = (set.teamFilter == teamExp.Team.Id) ? 0 : teamExp.Team.Id;
            // same as the player filter: in table mode the lineups are a tab
            // in this panel, so show the filtered result
            if (set.teamFilter && !vm.cardMode) { vm.setExpTab('lineups'); }
        };

        // name of the team currently filtered in this set (or null), for the status message
        vm.getSetTeamFilterName = function (set) {
            if (!set || !set.teamFilter || !set.TeamStackExp) { return null; }
            for (var i = 0; i < set.TeamStackExp.length; i++) {
                if (set.TeamStackExp[i].Team.Id == set.teamFilter) {
                    return set.TeamStackExp[i].Team.Name;
                }
            }
            return null;
        };

        vm.clearSetTeamFilter = function (set) {
            if (set) { set.teamFilter = 0; }
        };

        // player exposure filter: show only lineups that contain this player
        vm.setPlayerFilterIsEnabled = function (set, exp) {
            return (set.playerFilter == exp.Salary.PID);
        };

        vm.filterSetPlayerExposure = function (set, exp) {
            set.playerFilter = (set.playerFilter == exp.Salary.PID) ? 0 : exp.Salary.PID;
            // TABLE mode: the lineups live in this panel's Lineups tab, so a
            // filter applied from the Players tab would otherwise show no
            // visible result - jump to the filtered lineups. (Card mode
            // needs no switch: the cards are already beside the panel.)
            if (set.playerFilter && !vm.cardMode) { vm.setExpTab('lineups'); }
        };

        // name of the player currently filtered in this set (or null), for the status message
        vm.getSetPlayerFilterName = function (set) {
            if (!set || !set.playerFilter || !set.Exposure) { return null; }
            for (var i = 0; i < set.Exposure.length; i++) {
                if (set.Exposure[i].Salary.PID == set.playerFilter) {
                    return set.Exposure[i].Salary.Name;
                }
            }
            return null;
        };

        vm.clearSetPlayerFilter = function (set) {
            if (set) { set.playerFilter = 0; }
        };

        // lineups compact view (m.luDlgCompact - now driven by the page density
        // control, see setDensityMode) renders each lineup as a comma-separated
        // line of player last names instead of the full per-player rows.
        vm.fscLastName = function (name) {
            if (!name) { return ''; }
            var parts = name.trim().split(/\s+/);
            if (parts.length <= 1) { return name; }
            var suffixes = { 'jr': 1, 'jr.': 1, 'sr': 1, 'sr.': 1, 'ii': 1, 'iii': 1, 'iv': 1, 'v': 1 };
            var last = parts[parts.length - 1];
            if (suffixes[last.toLowerCase()] && parts.length >= 3) {
                return parts[parts.length - 2];
            }
            return last;
        };
        vm.fscEscapeHtml = function (s) {
            if (s == null) { return ''; }
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };
        // comma-separated last names for compact view; when a team/player filter
        // is active, the matching players' names are wrapped for highlighting
        vm.getLineupNamesHtml = function (lineup, set) {
            if (!lineup || !lineup.LineupItems) { return ''; }
            var pf = set ? set.playerFilter : 0;
            var tf = set ? set.teamFilter : 0;
            var out = [];
            for (var i = 0; i < lineup.LineupItems.length; i++) {
                var sal = lineup.LineupItems[i].Salary;
                if (!sal || !sal.Name) { continue; }
                var nm = vm.fscEscapeHtml(vm.fscLastName(sal.Name));
                var match = (pf && sal.PID == pf) || (tf && sal.PTID == tf);
                out.push(match ? '<span class="luCompactMatch">' + nm + '</span>' : nm);
            }
            return out.join(', ');
        };
        // one-line summary of a lineup's totals + stacks, for compact view
        vm.getLineupSummaryLine = function (lineup) {
            if (!lineup) { return ''; }
            var parts = [];
            if (lineup.Salary != null) { parts.push('$' + lineup.Salary); }
            if (lineup.PP != null) { parts.push('Proj ' + lineup.PP.toFixed(2)); }
            if (lineup.Owned != null) { parts.push(lineup.Owned.toFixed(0) + '% pOwn'); }
            if (lineup.PS > 0) { parts.push('Scored ' + lineup.PS.toFixed(2)); }
            if (vm.periodData && vm.periodData.HasTeams && lineup.TeamStack && lineup.TeamStack.length) {
                var stacks = [];
                for (var i = 0; i < lineup.TeamStack.length; i++) {
                    var s = lineup.TeamStack[i];
                    stacks.push((s.TeamName || '') + '×' + s.cnt);
                }
                if (stacks.length) { parts.push('Stacks ' + stacks.join(', ')); }
            }
            return parts.join('  •  ');
        };

        // (showMoreLineupsInSet removed - the selected set now renders all of its
        // lineups; we no longer lazy-load on scroll since only one set is in the DOM)

        vm.populatePlayersIntoBuilder = function(players){
            var added = 0;

            $scope.$apply(() => {
                for (var i = 0; i < players.length; i++) {
                    if (vm.addPlayerToLineupBuilder(players[i])) {
                        added++;
                    }
                }
                //$scope.$digest();
                if (added == players.length) {
                    vm.showtoast('All players from the stack have been added to the lineup.');
                } else {
                    vm.showtoast('Only ' + added + ' players were added from the stack.');
                }
            });
		};

        vm.findOppPlayerForTeam = function(tid, gid, pos) {
            var sals = vm.salaryContainer.Salaries;
            if(sals != null){
                for (var i = 0; i < sals.length; i++) {
                    var ps = sals[i];
                    if (ps.OTID == tid &&
                        ps.GID == gid &&
                        ps.STAT == 1 &&
                        ps.POS.indexOf(pos) >= 0) {
                        return ps;
                    }
                }
            }
            return null;
        };

        vm.findOppGoalie = function(ps){
            return vm.findOppPlayerForTeam(ps.PTID, ps.GID, 'G');
		};

        vm.findOppPitcher = function(ps) {
            return vm.findOppPlayerForTeam(ps.PTID, ps.GID, 'P');
        };

        vm.getStartingHittersVsPitcher = function(ps){
            var hitters = [];
            var sals = vm.salaryContainer.Salaries;
            for(var i=0; i<sals.length; i++){
                var p = sals[i];
                if(p.STAT == 1 && p.GID == ps.GID && p.OTID == ps.PTID && p.POS.indexOf('P') < 0){
                    hitters.push(p);
				}
            }
            return hitters;
		};
        vm.initFootballPlayer = function (ps) {
            if (ps.STAT != 1) {
                return;
            }
            if (ps.POS.indexOf('WR') >= 0 || ps.POS.indexOf('TE') >= 0) {
                if (ps.OE != null && ps.OE.length > 0) {
                    ps.VersusStr = ps.OE + ", " + ps.OTEAM;
                }
            }
        };
        vm.initBaseballPlayer = function(ps){
            if(ps.STAT != 1){
                return;     
			}

            if(ps.POS.indexOf('P') < 0){
                var pitch = vm.findOppPitcher(ps);
                ps.BatThrow = ps.OE + " / ";
                ps.oppPitcher = pitch;
                if(pitch != null){
                    ps.VersusStr = pitch.Name + ", " + ps.OTEAM;
                    ps.BatThrow += pitch.OE;

                    if(ps.OE == 'S' || (ps.OE != pitch.OE)){
                        ps.mlbLRAdvantage = 1;
					}
                }else{
                    ps.BatThrow += "?";
				}
            }else{

                var hitters = vm.getStartingHittersVsPitcher(ps);
                ps.leftHitters = ps.rightHitters = 0;

                for(var j=0;j<hitters.length;j++){
                    var h = hitters[j];
                    if(h.OE == 'L' || (h.OE == 'S' && ps.OE =='R')){
                        ps.leftHitters++;              
					}else if(h.OE == 'R' || (h.OE == 'S' && ps.OE =='L')){
                        ps.rightHitters++;              
					}
				}

                if((ps.OE == 'R' && (ps.leftHitters < ps.rightHitters)) || (ps.OE == 'L' && (ps.rightHitters < ps.leftHitters)) ){
                    ps.mlbLRAdvantage = 1;        
				}

                ps.isPitcher = true;
                ps.BatThrow = ps.rightHitters + "R, " + ps.leftHitters + "L";
			}
		};

        vm.chart_debounce = LineStarUtility.debounce(vm.populateCharts, vm.isMobileDevice ? 500 : 50);


        //
        vm.refreshSalaryData = function(){
            vm.showQueryAnim = true;

            webService.getSalaries(function (data) {
                vm.periodData = data;
                vm.salaryContainer = $.parseJSON(data.SalaryContainerJson);
                vm.periodData.SalaryContainerJson = "";

                if(vm.salaryContainer == null || vm.salaryContainer == undefined){
                    var sc = vm.salaryContainer = {};      
                    sc.Period = {Name:'Period Not Found'};
                    sc.Games = [];
                    sc.Salaries = [];
                    sc.SalariesMap = { Variants: []};
                    vm.periodData.PositionFilters = [];
                    vm.periodData.AdvancedOptions = [];
                    vm.periodData.GenerateMethods = [];
                    data.Ownership = { Projected: {}, ContestResults: []};
				}

                vm.periodName = vm.periodData.HasTeams ? vm.salaryContainer.Period.Name : vm.salaryContainer.Period.LocationName;
                
                var luDate = LineStarUtility.parseTime2(vm.salaryContainer.Period.LU);
                vm.lastUpdated = prettyDate(luDate);
                // surface it on the wrapper controller so the pages flyout
                // (mlc scope, outside this controller) can show it under the
                // page name
                try { $scope.$parent.$parent.mlc.lastUpdated = vm.lastUpdated; } catch (e) {}

                playerDict = {};
                vm.SalaryDict = {};
                vm.GameDict = {};
                vm.TeamDict = {};

                //
                vm.periodData.PositionFiltersBackup = [];
                var pfs = vm.periodData.PositionFilters;
                for(var i=0; i < pfs.length; i++){
                    vm.periodData.PositionFiltersBackup.push(pfs[i]);
				}

                var games = vm.salaryContainer.Games;
                for(var i=0; i<games.length;i++){
                    var g = games[i];
                    vm.GameDict[g.GameId] = g;

                    if (g.AwayTeamId > 0) {
                        var url = (g.AwayTeamImgUrl != null) ? vm.TeamImgBase + g.AwayTeamImgUrl : null;
                        vm.TeamDict[g.AwayTeamId] = { Id: g.AwayTeamId, Name: g.AwayTeam, ImgUrl: url };
                    } 
                    if (g.HomeTeamId > 0) {
                        var url = (g.HomeTeamImgUrl != null) ? vm.TeamImgBase + g.HomeTeamImgUrl : null;
                        vm.TeamDict[g.HomeTeamId] = { Id: g.HomeTeamId, Name: g.HomeTeam, ImgUrl: url };
                    }
                }

                var slates = vm.salaryContainer.Slates;
                for (var i = 0; i < slates.length; i++) {
                    var s = slates[i];
                    var lrs = s.LineupRequirements;
                    for (var j = 0; j < lrs.length; j++) {
                        var lr = lrs[j];
                        lr.classText = vm.getPositionClass(lr.Positions);
                    }
                }

                var sals = vm.salaryContainer.Salaries;
                for(var i=0; i<sals.length; i++){
                    var ps = sals[i];

                    ps.UserPP = ps.PP;
                    ps.MatchupScore = 0;
                    ps.MatchupData = [];
                    ps.LoveCount = ps.HateCount = ps.StartingStatus = ps.MessageCount = ps.ProjLocked = 0;
                    ps.dataCol0 = ps.dataCol1 = ps.dataCol2 = ps.mlbLRAdvantage = ps.NewsCntNew = ps.NewsCntOld = 0;
                    ps.LU = ps.PPL = 100;
                    ps.chartData = null;
                    ps.chartDataLoading = 0;
                    ps.chartDataDomPopd= 0;
                    ps.Alerts = null;
                    ps.Owned =0;
                    ps.depthOrder = "";
                    ps.shortName = vm.getShortName(ps.Name);

                    vm.processAlerts(ps);

                    ps.IsExpanded = vm.allPlayersExpanded;
                    ps.IsLocked = false;
                    ps.Game = vm.GameDict[ps.GID];
                    ps.TeamImg = vm.getPlayerTeamImgUrl(ps, 0);
                    ps.OppTeamImg = vm.getPlayerTeamImgUrl(ps, 1);
                    ps.PlayerImg = vm.getPlayerImg(ps);
                    ps.PosClass = vm.getPlayerPosClass(ps);
                    ps.OTEAM_VS = (ps.Game != null) ? (ps.PTID==ps.Game.HomeTeamId) ? "vs " : "@" : "";
                    ps.OTEAM_VS += ps.OTEAM;
                    ps.VersusStr = vm.getOppTeamVersusStr(ps) + ps.OTEAM;
                    ps.ShortGameTime = vm.getPlayerGameTime(ps);
                    ps.OppRankStr = vm.getPlayerOppRank(ps);
                    ps.SlateOwnership = ps.ActSlateOwnership = 0;
					
                    if(ps.Game != null && ps.Game.Status > ps. SS){
                        ps.SS = ps.Game.Status;
                    }

                    if(ps.Conf > 0 && !vm.dynamic.hasConfData){
                        vm.dynamic.hasConfData=false;
                    }
                    if(ps.Ceil > 0 && !vm.dynamic.hasCeilData){
                        vm.dynamic.hasCeilData = true;
                    }
                    if(ps.Floor > 0 && !vm.dynamic.hasFloorData){
                        vm.dynamic.hasFloorData=true;
                    }

                    if (LineStar.Sport == 1) {
                        vm.initFootballPlayer(ps);
                    }
                    else if(LineStar.Sport == 3){
                        vm.initBaseballPlayer(ps);
					}

                    ps.sportSpecificCol0 = vm.getSportSpecificColValue(ps, 0);
                    ps.sportSpecificCol1 = vm.getSportSpecificColValue(ps, 1);

                    vm.SalaryDict[ps.Id] = ps;

                    if(playerDict[ps.PID] == null){
                        playerDict[ps.PID] = [];
				    }
                    playerDict[ps.PID].push(ps);
                }

                vm.initMatchupData(playerDict);

                var variantDict = {};
                var sm = vm.salaryContainer.SalariesMap.Variants;
                for(var i=0; i<sm.length;i++){
                    var v = sm[i];
                    variantDict[v.Id] = v;
				}

                if (data.AvgAdjustments !== null) {
                    for (i = 0; i < data.AvgAdjustments.length; i++) {
                        var adj = data.AvgAdjustments[i];
                        var ps = vm.SalaryDict[adj.SalaryId];
                        if (ps != null) {
                            ps.LoveCount = adj.LoveCount;
                            ps.HateCount = adj.HateCount;
                        }
                    }
                }       
            
                var chatSum = data.ChatSummary;
                if(chatSum != null){
                    for(var i=0; i<chatSum.length; i++){
                        var cs = chatSum[i];
                        if(cs.PlayerId > 0){
                            var psArr = playerDict[cs.PlayerId];
                            if(psArr != null && psArr != undefined){
                                for(var j=0;j<psArr.length;j++){
                                    psArr[j].MessageCount= cs.MessageCount;
					            }
                            }
                        }
			        }
                }

                var ns = data.NewsSummary;
                if(ns != null){
                    for (i = 0; i < ns.length; i++) {
                        var ni = ns[i];
                        if (ni.PID > 0) {
                            var psArr = playerDict[ni.PID];
                            if(psArr != null){
                                for(var j=0;j<psArr.length;j++){
                                    psArr[j].NewsCntNew= ni.NewCnt;
                                    psArr[j].NewsCntOld= ni.OldCnt;
						        }
                            }
                        }
                    }
				}

                data.Ownership.ProjectedDict = {};

                if(data.Ownership.Projected != null){
                    for(var key in data.Ownership.Projected){
                        var slateOwn = data.Ownership.Projected[key];
                        var ownDict = {};

                        for(var i=0; i < slateOwn.length; i++){
                            ownDict[slateOwn[i].SalaryId] = slateOwn[i];
						}

                        vm.periodData.Ownership.ProjectedDict[key] = ownDict;
					}
				}

                vm.salariesPerSlate = {};
                var optSettings = vm.getOptiSettingsObj();
                var ssm = vm.salaryContainer.SalariesMap.SlateSalaryMap;
                for(var key in ssm){
                    var sssm = ssm[key];
                    var slate = vm.getSlate(key);

                    var salarySlateDict = {};
                    vm.salariesPerSlate[slate.Id] = salarySlateDict;

                    for(var i=0;i<sssm.length; i++){
                        var s = sssm[i];
                        var v = variantDict[s];
                        var ps = vm.SalaryDict[v.psid];
                        if(ps == null || ps == undefined){
                            continue;              
						}
                        var clone = JSON.parse(JSON.stringify(ps));

                        clone.ActiveVariantId = v.Id;
                        clone.SAL = v.s;
                        clone.POS = v.p;
                        clone.Ceil = v.pc;
                        clone.Floor = v.pf;
                        clone.SAL = v.s;
                        clone.PP = v.sp;
                        clone.PS = LineStarUtility.round(v.ps, 2);
                        clone.Tier = v.t;
                        clone.LineupPos = (v.t > 0) ? 'T' + v.t : v.p;
                        clone.Owned = vm.getPlayerOwnForSlate(clone, slate);
                        clone.Game = vm.GameDict[ps.GID];

                        var um = vm.findUserMod(clone);
                        if(um != null){
                            vm.updateSalaryWithMod(clone, um, optSettings);
                        }

                        salarySlateDict[ps.Id] = clone;
					}
				}

                var sets = vm.periodData.Sets;
                if(sets != null){
                    for(var i=0; i < sets.length; i++){
                        var s = sets[i];
                        s.needsSave = 0;
                        s.remote = 1;
                        s.ShowItem = false;
                        vm.processLineupSetStatsSet(s);
                    }
                }
                vm.updateLineupSetCounts();

                vm.loadLineupBuilder();
			    vm.onSlateChanged();
                
                vm.updateSortState();
                vm.updateSelectedGenerateModel();

                vm.showQueryAnim = false;

                if(sals.length == 0){  
                    vm.showNoSalaryDataMsg = true;
				}

                vm.setupAdmin(playerDict);
            });
        };

        vm.getShortName = function (name) {
            const [firstName, ...lastName] = name.split(' ').filter(Boolean);
            if (lastName.length == 0) {
                return firstName;
            }
            return firstName[0] + "." + lastName.join(' ');
        };
        vm.onAdminProjModified = function (p) {
            p.savingAdmin = 1;
            p.AdminAdjusted = 1;
        };
        vm.onAdminProjChanged = function (p) {
            if (!(p.AdminOverride == null || p.AdminOverride.Projection != parseFloat(p.OverridePP))) {
                return;
            }
            if (p.AdminAdjusted != 1) {
                return;
            }
            p.AdminAdjusted = 0;
            if (p.OverridePP == 0) {
                vm.adjustAdminPctOverride(p, 0, 1, 0, false);
            } else {
                vm.adjustAdminPctOverride(p, 0, 1, 0, true);
            }
		};

        vm.resetAdminProjection = function(p){
            vm.adjustAdminPctOverride(p, 100, 1, 1, false);
		};

        vm.incAdminProjection = function(p){
            vm.adjustAdminPctOverride(p, 5, 0, 1, false);
		};
        vm.decAdminProjection = function(p){
            vm.adjustAdminPctOverride(p, -5, 0, 1, false);
		};

        vm.saveAdminOverrides = function(){
           
            var toSave = vm.overridesToSave.slice();
            vm.overridesToSave = [];

            for(var i=0; i < toSave.length; i++){
                var ovr = toSave[i];
                if (ovr.UpdateProj) {
                    webService.saveOverrideProj(ovr, function (result) {
                        ovr.player.savingAdmin = 0;
                    });
                } else {
                    webService.saveOverride(ovr, function (result) {
                        ovr.player.savingAdmin = 0;
                    });
                }
            }
		};
        vm.saveAdminOverridesDebounce = LineStarUtility.debounce(vm.saveAdminOverrides, 2000);

        vm.adjustAdminPctOverride = function(p, val, set, upd, updateProj){
            var ovr = p.AdminOverride;
            if(ovr == null){
                ovr =  { PlayerId: p.PID, GameId: p.GID, Percentage: 100, Changed: true };
            }

            if ((ovr.UpdateProj = updateProj)) {
                ovr.Projection = parseFloat(p.OverridePP);
                ovr.Percentage = 100;
            } else {
                if (set) {
                    ovr.Percentage = val;
                } else {
                    ovr.Percentage += val;
                }
                p.AdminOverride = ovr;
                if (upd) {
                    p.OverridePP = LineStarUtility.round((p.UneditedPP * (ovr.Percentage / 100)), 2);
                }
            }
            ovr.player = p;
            p.savingAdmin = 1;

            var idx = vm.overridesToSave.indexOf(ovr);
            if(idx < 0){
                vm.overridesToSave.push(ovr);
                vm.saveAdminOverridesDebounce();
            }
        };

        vm.setupAdmin = function(playerDict){
            if(vm.IsAdmin){
                webService.getOverrides(function(overrides){
                    var overrideDict = {};
                    for (var i = 0; i < overrides.length; i++) {
                        var ovr = overrides[i];
                        overrideDict['' + ovr.PlayerId+ovr.GameId] = ovr;
                    }

                    for (var key in vm.salariesPerSlate) {
                        var slateSalaries = vm.salariesPerSlate[key];
                        for(var pKey in slateSalaries){
                            var sal = slateSalaries[pKey];
                            sal.OverridePP = sal.PP;
                            sal.UneditedPP = sal.PP;
                            sal.AdminOverride = null;

                            var ovr = overrideDict['' + sal.PID+sal.GID];
                            if(ovr != null && ovr != undefined){
                                sal.AdminOverride = ovr;
                                sal.UneditedPP = LineStarUtility.round((sal.PP / (ovr.Percentage / 100)), 2);

                                if (ovr.Projection > 0 && ovr.Percentage == 100) {
                                    sal.OverridePP = ovr.Projection;
                                } else {
                                    sal.OverridePP = LineStarUtility.round((sal.UneditedPP * (ovr.Percentage / 100)), 2);
                                }
							}
                        }
                    }
				});
			}
        };

        vm.getLineupItemScored = function (li) {
            var ps = 0;
            if (li != null && li.Salary != null) {
                var pm = (li.req != null) ? li.req.PointMultiplier : 1;
                ps = LineStarUtility.round((li.Salary.PS * pm), 2);
            }
            return ps;
        };

        // Positions that never count toward a team stack, by sport. A stack is
        // about players who score together off the same offense, and a pitcher
        // or a goalie scores off the OPPOSING team failing - so they correlate
        // with their own bats and skaters barely at all. Counting them turned
        // "3 LAD" into two hitters plus the starter: a 2-stack wearing a
        // 3-stack badge, in the lineup badges and the team exposure table both.
        // Sport ids match the pool filters: 3 = MLB, 6 = NHL.
        vm.stackExcludedPos = {
            3: { 'P': 1, 'SP': 1, 'RP': 1 },
            6: { 'G': 1 }
		};

        vm.countsTowardTeamStack = function(sal){
            var ex = (sal != null) ? vm.stackExcludedPos[vm.Sport] : null;
            if(ex == null || sal.POS == null){
                return 1;
			}
            // Only drops out when EVERY eligible slot is excluded - a C/1B is a
            // bat whatever else is in the string, and this way an unexpected
            // combined token can't quietly remove a hitter from the count.
            var pa = sal.POS.toUpperCase().split(/[,\/]/);
            for(var i=0; i<pa.length; i++){
                var t = pa[i].trim();
                if(t.length > 0 && !ex[t]){
                    return 1;
				}
			}
            return 0;
		};

        vm.processLineupSetStatsSet = function(s){
            s.Exposure = [];
            s.TeamStackExp = [];
            var dict = {};
            var teamExpDict = {};
            var slate = vm.getSlate(s.SetInfo.SlateId);
            if (slate == null || slate == undefined) {
                return;
            }
            var salDict = vm.salariesPerSlate[slate.Id];

            s.MaxScored = 0;
            s.AvgScored = 0;
            s.AvgSalaryUsed = 0;
            s.SetInfo.LineupCount = s.Lineups.length;
            // stamp the original (as-optimized) order ONCE, before any sort reorders them,
            // so the "Default" sort mode can always restore the optimizer's order
            for (var oi = 0; oi < s.Lineups.length; oi++) {
                if (s.Lineups[oi].OrigIdx === undefined) { s.Lineups[oi].OrigIdx = oi; }
            }
            vm.sortLineupsBySetting(s);   // keep every set ordered by the persistent sort selection

            for(var j=0;j<s.Lineups.length; j++){
                var l = s.Lineups[j];

                l.Salary = 0;
                l.PP = 0;
                l.PS = 0;
                // Consensus (aggregate industry) projection total, summed the
                // same way as PP so the two are directly comparable.
                l.ConsPP = 0;
                l.Owned = 0;
                l.Teams = {};
                l.TeamStack = [];

                for(var k =0; k <l.LineupItems.length; k++){
                    var li = l.LineupItems[k];
                    var itm = dict[li.SalaryId];
                    li.Salary = salDict[li.SalaryId];
                    if(li.Salary == null || li.Salary == undefined){
                        li.Salary = null;
                        continue;           
					}

                    li.req = slate.LineupRequirements[k];

                    var sal = li.Salary.SAL;
                    var proj = li.Salary.UserPP;
                    var ps = li.Salary.PS;
                    // AggProj is the consensus figure; it is absent for players
                    // no industry source covers, so treat a non-number as 0
                    // rather than letting it poison the whole lineup total.
                    var consProj = parseFloat(li.Salary.AggProj);
                    if (!isFinite(consProj) || consProj < 0) { consProj = 0; }

                    if(li.req.SalMult > 1){
                        sal *= li.req.SalMult;
					}
                    if(li.req.PointMultiplier > 1){
                        proj *= li.req.PointMultiplier;
                        ps *= li.req.PointMultiplier;
                        consProj *= li.req.PointMultiplier;
					}

                    l.Salary += sal;
                    l.PP += proj;
                    l.PS += ps;
                    l.ConsPP += consProj;
                    l.Owned += li.Salary.Owned;

                    if(itm == null || itm === undefined){
                        itm = dict[li.SalaryId] = { LineupCnt:0, Salary:li.Salary };
					}

                    // a team carrying only its pitcher/goalie never gets an
                    // entry at all, so it can't reach the 2+ threshold below
                    if(vm.periodData.HasTeams && vm.countsTowardTeamStack(li.Salary)){
                        if(l.Teams[li.Salary.PTID] === undefined){
                            l.Teams[li.Salary.PTID] = { cnt: 0, TeamImg: li.Salary.TeamImg, TeamName: li.Salary.PTEAM, TeamId: li.Salary.PTID};
					    }
                        l.Teams[li.Salary.PTID].cnt++;
                    }

                    itm.LineupCnt++;
				}

                for(var tKey in l.Teams){
                    var ts = l.Teams[tKey];
                    if(ts.cnt >= 2){
                        l.TeamStack.push(ts);
                        
                        var teamExp = teamExpDict[tKey];
                        if (teamExp == null || teamExp == undefined) {
                            teamExpDict[tKey] = teamExp = { TID: tKey, Team: vm.TeamDict[tKey], Cnt: 0, Pct: 0, TwoStack: 0, ThreeStack:0, FourStack:0, FiveStack:0 };
                        } 

                        if (ts.cnt >= 5) {
                            teamExp.FiveStack++;
                        }else if (ts.cnt >= 4) {
                            teamExp.FourStack++;
                        }else if (ts.cnt >= 3) {
                            teamExp.ThreeStack++;
                        }else if (ts.cnt >= 2) {
                            teamExp.TwoStack++;
                        }
                        
                        teamExp.Cnt++;
					}
				}

                if(l.PS > s.MaxScored){
                    s.MaxScored = l.PS;        
				}
                s.AvgScored += l.PS;
                s.AvgSalaryUsed += l.Salary;
			}

            s.AvgSalaryUsed = LineStarUtility.round(s.AvgSalaryUsed/s.Lineups.length, 0);
            s.AvgScored = LineStarUtility.round(s.AvgScored/s.Lineups.length, 2);


            for (var key in teamExpDict) {
                var val = teamExpDict[key];
                val.Pct = LineStarUtility.round(((val.Cnt / s.Lineups.length) * 100), 0);
                s.TeamStackExp.push(val);
            }
            s.TeamStackExp.sort(function (a, b) {
                return b.Cnt - a.Cnt;
            });

            // warning flag for the set picker: true if any player used in the set is
            // projected for 0 (same condition that reddens a lineup item / exposure row)
            s.hasZeroProjPlayer = false;
            for(var key in dict){
                var val = dict[key];
                val.Pct = LineStarUtility.round(((val.LineupCnt/s.Lineups.length)*100), 0);
                if (val.Salary && val.Salary.PP <= 0) { s.hasZeroProjPlayer = true; }
                s.Exposure.push(val);
			}
            s.Exposure.sort(function (a,b) {
                return b.LineupCnt - a.LineupCnt;
			});

            /* Re-stamp any user-defined matchup columns. Has to run after the
               loop above, because it reads li.Salary, which is only resolved
               there - and on every refresh, since new lineups arrive unstamped
               and a period change can swap the matchup feed underneath them. */
            vm.luApplyCustomCols();

            vm.updateLineupSetCounts();
		};

        vm.getGenerateModel = function(id){
            var md = vm.periodData.GenerateMethods;
            for(var i=0;i<md.length;i++){
                if(md[i].Method == id){
                    return md[i];        
				} 
			}
            return null;
		};

        vm.updateSelectedGenerateModel = function(){
            var md = vm.periodData.GenerateMethods;
            for(var i=0;i<md.length;i++){
                md[i].Img = '/Portals/0/images/alerts/' + vm.genMethodImages[md[i].Method] + '.svg';
			}
            vm.generateModel = vm.getGenerateModel(vm.generateModelVal);
		};


        vm.static.shouldShowSportSpecCol0 = vm.getShowSportSpecificCol(0);
        vm.static.shouldShowSportSpecCol1 = vm.getShowSportSpecificCol(1);
        vm.static.sportSpecificColName0 = vm.getSportSpecificColName(0);
        vm.static.sportSpecificColName1 = vm.getSportSpecificColName(1);
        vm.static.sportSpecificToolTip0 = vm.getSportSpecificToolTip(0);
        vm.static.sportSpecificToolTip1 = vm.getSportSpecificToolTip(1);
        vm.static.impColHeaderName = vm.getImpColHeader();
 
        //
        vm.refreshSalaryData();

        //
        vm.onFilterNameChanged = function(){
            //var val = $('#filterName').val();
            var val = vm.filter_name;
            if(val != null && val.length){
                vm.filter_name = LineStarUtility.removeDiacritics(val);
            }else{
                vm.filter_name = null;
			}
            if(vm.filter_name!=null && vm.filter_name.length==0){
                vm.filter_name= null;     
			}
            vm.filter_debounce();
		};

        vm.onFilterAllTeams = function(filt){
            // mode 3 (position-rule teams): a plain select/deselect, with no
            // exposure to gate it - a team is either in the rule or it is not.
            if (vm.teamPopupSelectorMode === vm.POS_STACK_TEAM_MODE) {
                for (var pi = 0; pi < vm.teamsInSlate.length; pi++) {
                    vm.teamsInSlate[pi].IsStacking = (filt > 0);
				}
                vm.syncPosStackTeams();
                return;
            }
            if(vm.teamPopupSelectorMode == 1){
                for(var ti =0; ti<vm.teamsInSlate.length; ti++){
                     var team = vm.teamsInSlate[ti];
                     team.IsDisplayed = (filt > 0);
			    }
                vm.onTeamFilterChanged(null);
            }else if(vm.teamPopupSelectorMode == 0){
                for (var ti = 0; ti < vm.teamsInSlate.length; ti++){
                    var team = vm.teamsInSlate[ti];
                    team.Included = (filt > 0);
                }
                vm.onTeamIncludeChanged(1, 0);
            } else if (vm.teamPopupSelectorMode == 2) {

                var globalExp = vm.getGlobalTeamStackExp();

                for (var ti = 0; ti < vm.teamsInSlate.length; ti++) {
                    var team = vm.teamsInSlate[ti];
                    team.IsStacking = (filt > 0 && globalExp > 0);
                    if (!team.IsStacking) {
                        team.maxExp = "0";
                    } else {
                        if (team.maxExp == "0") {
                            team.maxExp = globalExp.toString();
                        }
                    }
                    vm.showCreateStackItem.teams[team.Id] = team.maxExp;
                }
                vm.updateStackOptionCnt(vm.showCreateStackItem)
            }
        };
        vm.getGlobalTeamStackExp = function () {
            var globalExp = parseInt(vm.teamStackGlobal);
            if (isNaN(globalExp)) {
                globalExp = 100;
            }
            if (globalExp < 0) {
                globalExp = 0;
            }
            if (globalExp > 100) {
                globalExp = 100;
            }
            return globalExp;
        };

        vm.onTeamFilterChangedCallback = function(){};

        // Filter the projections to a single game's two teams (toggles off if already the
        // exact filter). Teams live in vm.teamsInSlate (keyed by .Id, with .IsDisplayed).
        vm.filterToGameTeams = function (id1, id2) {
            var t1 = null, t2 = null;
            for (var i = 0; i < vm.teamsInSlate.length; i++) {
                var t = vm.teamsInSlate[i];
                if (t.Id === id1) { t1 = t; } else if (t.Id === id2) { t2 = t; }
            }
            if (t1 == null && t2 == null) { return; }          // game not in this slate
            var targets = [];
            if (t1) { targets.push(id1); }
            if (t2) { targets.push(id2); }
            var displayed = [];
            for (var j = 0; j < vm.teamsInSlate.length; j++) { if (vm.teamsInSlate[j].IsDisplayed) { displayed.push(vm.teamsInSlate[j].Id); } }
            var isExact = displayed.length === targets.length && targets.every(function (x) { return displayed.indexOf(x) >= 0; });
            for (var k = 0; k < vm.teamsInSlate.length; k++) { vm.teamsInSlate[k].IsDisplayed = false; }
            if (!isExact) {                                    // not already this game -> apply it
                if (t1) { t1.IsDisplayed = true; }
                if (t2) { t2.IsDisplayed = true; }
            }
            vm.onTeamFilterChanged(null);                      // rebuilds filter_teams, re-filters, syncs highlight
        };

        // Flair the games-strip box whose two teams are the current filter (both displayed).
        // The .gameBox is rendered by the layout wrapper, so we toggle a class on the DOM.
        vm.syncGameBoxHighlight = function () {
            var boxes = document.querySelectorAll('.gameBox');
            for (var i = 0; i < boxes.length; i++) {
                var box = boxes[i];
                var a = box.querySelector('.awayTeamArea');
                var h = box.querySelector('.homeTeamArea');
                var aId = a ? parseInt(a.getAttribute('data-teamid'), 10) : NaN;
                var hId = h ? parseInt(h.getAttribute('data-teamid'), 10) : NaN;
                if (vm.filter_teams[aId] != null && vm.filter_teams[hId] != null) { box.classList.add('ppfGameActive'); }
                else { box.classList.remove('ppfGameActive'); }
            }
        };

        vm.onTeamFilterChanged = function(team){
            var filteredTeams = {};
            for(var ti =0; ti<vm.teamsInSlate.length; ti++){
                 var t = vm.teamsInSlate[ti];
                 if(t.IsDisplayed){
                    filteredTeams[t.Id] = t;
				 }
			}
            vm.filter_teams = filteredTeams;
            vm.syncGameBoxHighlight();
            vm.filter_debounce();
            vm.onTeamFilterChangedCallback();
		};

        vm.getLineGenSettingsChanged = function(){
            var cnt = 0;
            var opts = vm.periodData.AdvancedOptions;
            for (var i = 0; i < opts.length; i++){
                if(opts[i].Value1 != opts[i].Val1 && opts[i].Option != 17){
                    cnt++;     
				}
			}
            return cnt;
		};

        vm.getLineGenSettingOpt = function (id) {
            var opts = vm.periodData.AdvancedOptions;
            for (var i = 0; i < opts.length; i++) {
                if (opts[i].Option == id) {
                    return opts[i];
                }
            }
            return null;
        };

        vm.getLineGenSetting = function(id){
            var opts = vm.periodData.AdvancedOptions;
            for(var i=0; i < opts.length; i++){
                if(opts[i].Option == id){
                    return opts[i].Val1;        
				}
			}
            return 0;
		};

        vm.getOptimizeOptions = function(){
            var options = [];
 
            $.each(vm.periodData.AdvancedOptions, function (i, item) {
                var o = null;
                if (item.OptionType == 1) {
                    var val = item.Val1;
                    if (item.Option == 21) {
                        //Setting got reversed
                        val = (item.Val1 == 1) ? 0 : 1;
                    }
                    o = { Value1: val, Value2: 0 };
                } else if (item.OptionType == 2) {

                    var val = item.Val1;
                    //Temporary fix
                    if (item.Option == 2) {
                        var slate = vm.selectedSlate;
                        if (slate != null) {
                            val = parseInt(val);
                            var slotCnt = slate.LineupRequirements.length;
                            var teamCnt = slate.SlateGames.length * 2;
                            for (var j = 0; j < 5; j++) {
                                if ((val * teamCnt) >= slotCnt) {
                                    break;
                                }
                                val++;
                            }
                        }
                    }

                    o = { Value1: val, Value2: 0 };
                } else if (item.OptionType == 3) {
                } else if (item.OptionType == 4) {
                    o = { Value1: item.Val1, Value2: item.Val2 };
                } else if (item.OptionType == 5) {
                    if (item.PosList != null) {
                        for (var j = 0; j < item.PosList.length; j++) {
                            var p = item.PosList[j];
                            o = { Params: p.Pos, Value1: LineStarUtility.ensureNumeric(p.Val), Value2: 0, OptionType: item.OptionType, Option: item.Option };
                            options.push(o);
                        }
                    }
                    o = null;
                }

                if (o != null) {
                    o.OptionType = item.OptionType;
                    o.Option = item.Option;
                    o.Value1 = LineStarUtility.ensureNumeric(o.Value1);
                    o.Value2 = LineStarUtility.ensureNumeric(o.Value2);
                    options.push(o);
                }
            });

            return options;
		};

        vm.getRandomLineupId = function() {
            return Math.floor(Math.random() * Math.floor(10000));
        };

        vm.findLineupInSet = function(set, lid) {
            var ls = set.Lineups;
            for (var i = 0; i < ls.length; i++) {
                var l = ls[i];
                if (l.Id == lid) {
                    return l;
                }
            }
            return null;
        };

        vm.assignLineupIds = function(set) {
            var ls = set.Lineups;
            for (var i = 0; i < ls.length; i++) {
                while (ls[i].Id<=0) {
                    var rId = vm.getRandomLineupId();
                    if (!vm.findLineupInSet(set, rId)) {
                        ls[i].Id = rId;
                    }
                }
            }
        };

        vm.jsonifySet = function(set) {
            var si = set.SetInfo;
            var jSet = { Sport: si.Sport, PeriodId: si.PeriodId, Site: si.Site, LocalId: si.LocalId, SetName: si.SetName, SlateId: si.SlateId, Model: si.Model, GeneratedAt: si.GeneratedAt };
            jSet.Lineups = [];
            for (var i = 0; i < set.Lineups.length; i++) {
                var sl = set.Lineups[i];
                var l = {};
                l.Name = sl.Name;
                l.SalaryList = [];
                for (var j = 0; j < sl.LineupItems.length; j++) {
                    var sli = sl.LineupItems[j];
                    l.SalaryList.push((sli != null) ? sli.SalaryId : 0);
                }
                jSet.Lineups.push(l);
            }
            return jSet;
        };

        vm.lastOptimizeTime = null;

        vm.copyLineup = function(lineup) {
            var copy = {};
            copy.Id = lineup.Id;
            copy.Created = lineup.Created;
            copy.LineupBuilder = 0;
            copy.PeriodId = lineup.PeriodId;
            copy.Modified = lineup.Modified;
            copy.Projection = lineup.Projection;
            copy.ReadableTime = lineup.ReadableTime;
            copy.emptySlots = lineup.emptySlots;
            copy.Sport = lineup.Sport;
            copy.Scored = lineup.Scored;
            copy.SlateId = lineup.SlateId;
            copy.salRemain = lineup.salRemain;
            copy.Site = lineup.Site;
            copy.Name = lineup.Name;
            copy.LineupItems = [];
            for (var i = 0; i < lineup.LineupItems.length; i++) {
                var item = lineup.LineupItems[i];
                copy.LineupItems.push((item != null) ? { Id: item.Id, LineupId: item.LineupId, PlayerId: item.PlayerId, Position: item.Position, Projection: item.Projection, SalaryId: item.SalaryId } : null);
            }
            return copy;
        };

        vm.builderToLineupClone = function(){
            var l = {};

            l.Created = "0001-01-01T00:00:00";
            l.Id = 0;
            l.LineupItems = [];
            l.Name = "Builder";
            l.Owned = 0;
            l.PP = 0;
            l.PS = 0;
            l.PeriodId = LineStar.PeriodId;
            l.Projection = 0
            l.ReadableTime = "";
            l.Salary = vm.lineupBuilder.SalUsed;
            l.Scored = 0
            l.Site = LineStar.Site;
            l.SlateId = vm.selectedSlate.Id;
            l.Sport = LineStar.Sport;

            for(var i=0; i < vm.lineupBuilder.slots.length; i++){
                var slot = vm.lineupBuilder.slots[i];
                l.LineupItems.push({ Id: 0, ItemOrder:0, LineupId: 0, PlayerId:0, Position:null, Projection:0, Salary:slot.salary, SalaryId: slot.salary.Id, req: slot.req });
			}

            return l;
		};

        vm.onLineupBuilderSave = function(){
            if(LineStar.IsPremium != 1){
                vm.showtoast('You must be a premium member in order to save lineups.');
                return;     
			}

            var lineup = vm.builderToLineupClone();
            vm.onMoveLineup(null, lineup);
        };

        vm.canStartOptimize = function () {
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a premium member in order to optimize lineups.');
                return false;
            }
            if (vm.optimizingLineups == 1) {
                vm.showtoast('Busy optimizing already..');
                return false;
            }
            var lastOpt = (vm.lastOptimizeTime != null) ? vm.lastOptimizeTime.getTime() : 0;
            var timeDiff = (new Date().getTime() - lastOpt) / 1000;
            if (timeDiff < 7) {
                vm.showtoast('You must wait a few moments before optimizing again.');
                return false;
            }
            var lpp = vm.likedPlayerPoolOpt;
            if (lpp != null && lpp.Val1 === 1 && !vm.canBuildWithLikedPlayerPool()) {
                vm.showtoast("WARNING: Liked player pool is enabled but not enough players have been liked. Disable the option or like more players.");
                return false;
            }
            return true;
        };

        vm.getRandomArbitrary = function (min, max) {
            return Math.random() * (max - min) + min;
        };

        vm.getSlatePosStats = function (slate, s) {
            var pa = s.POS.split(/[,\/]/);
            for (var i = 0; i < pa.length; i++) {
                var stats = slate.stats.byPos[pa[i]];
                if (stats != null) {
                    return stats;
                }
            }
            return null;
        };

        vm.getPlayerMatchupEle = function (p, colId, fieldId) {
            var ret = null;
            var pmd = vm.periodData.MatchupData;
            for (var j = 0; j < pmd.length; j++) {
                var item = pmd[j];
                if (item.Id != colId) { continue; }

                for (var i = 0; i < item.Columns.length; i++) {
                    var c = item.Columns[i];
                    if (c == fieldId) {
                        var pd = p.MatchupData[j];
                        if (pd != null) {
                            ret = vm.ensureNumericFloat(pd.Values[i]);
                        }
                        break;
                    }
                }
                break;
            }
            return ret;
        };

        // Does the OPTIMIZER's player set carry any consensus projection?
        // Computed once per run and cached on optObj (getOptiProjection is
        // called per player, so scanning there would be O(n^2)).
        //
        // Deliberately NOT vm.slateHasConsensus(): that reads
        // salaryListForSelSlate - the filtered, chunk-loaded VISIBLE list - and
        // the optimizer runs over salaryListForSelSlateALL. A position filter or
        // an unscrolled list would make it answer for the wrong set.
        vm.optiHasConsensus = function (optObj) {
            if (optObj._consAny == null) {
                optObj._consAny = false;

                var ss = optObj.ss || [];
                for (var i = 0; i < ss.length; i++) {
                    if (parseFloat(ss[i].AggProj) > 0) { optObj._consAny = true; break; }
                }
            }

            return optObj._consAny;
        };

        vm.getOptiProjection = function (s, optObj) {
            // The optimizer's OWN source decides this number - deliberately not
            // s.UserPP, which follows the table's picker. Reading UserPP here
            // would make the optimizer silently track whatever the user last
            // chose to look at, which is the opposite of two independent
            // controls.
            //
            // (This replaced the "use consensus projections" checkbox. Consensus
            // is now one option among the sources rather than a hidden boolean,
            // and its no-feed fallback moved into getOptiSourceProjection.)
            var p = vm.getOptiSourceProjection(s);

            // UserPP still gates ELIGIBILITY: a player the user zeroed out of
            // the pool stays out whichever source supplies the number.
            if (p <= 0 || s.UserPP <= 0) {
                return 0;
            }

            var needsModAdjust = 0;
            var conf = (s.Conf > 0) ? (1 + (s.Conf / 100)) : 1;
            var lev = vm.ensureNumericFloat(s.Leverage);
            var safety = vm.ensureNumericFloat(s.Safety);

            switch (vm.generateModelVal) {
                case 1: { //Predictable
                    //p = s.Floor + s.Safety;
                    //Lower low-salary players
                    var stats = vm.getSlatePosStats(optObj.slate, s);
                    var low = 1;
                    if (stats != null) {
                        if (s.SAL < (stats.minSal * 1.1)) {
                            low = 0;
                        }
                    }
                    p = low ? (p * conf) : (p * 0.6);
                } break;
                case 2: { //HighCeil
                    p += (s.Ceil * 2);
                } break;
                case 3: { //HighFloor
                    p += (s.Floor * 2);
                } break;
                case 4: { //Stars/Scrubs
                    var isSS = 0;
                    var stats = vm.getSlatePosStats(optObj.slate, s);
                    if (stats != null) {
                        if (s.SAL >= (stats.maxSal * .85) || s.SAL < (stats.minSal*1.2)) {
                            isSS = 1;
                        }
                           
                    }
                    if (isSS) {
                        p *= 2;
                    }
                } break;
                case 6: { //Random
                    var sal = (s.SAL > 1000) ? s.SAL / 100 : s.SAL;
                    p = vm.getRandomArbitrary(sal, sal * 1.2);
                } break;
                case 5: { //PPG
                    p += (s.PPG * 2);
                } break;
                case 7: { //DailyMatchups
                    var pmd = vm.periodData.MatchupData;
                    var cnt = 0;
                    for (var idx = 0; idx < s.MatchupData.length; idx++) {
                        var item = s.MatchupData[idx];
                        if (item != null) {

                            //NOTE: If Rank/Value is 0, this is a blank no-data category
                            if (item.Ranks[0] == 0 && item.Values[0] == 0 && pmd[idx].Columns[0] == 'PA') {
                                continue;
                            }

                            for (var i = 0; i < item.Ranks.length; i++) {
                                var r = item.Ranks[i];
                                if (r == 4) { //red
                                    cnt-=2;
                                } else if (r == 2) { //lightgreen
                                    cnt+=3;
                                } else if (r == 3) { //yellow
                                    cnt--;
                                } else if (r == 1) { //deep green
                                    cnt+=5;
                                }
                            }
                        }
                    }
                    //console.log(s.Name + ": " + cnt);
                    p = cnt;
                } break;
                case 10: { //MLB WOBA
                    if (s.POS.indexOf('P') >= 0) {
                        var oppTeamWoba = vm.getPlayerMatchupEle(s, 'oppTeamSplits', 'wOBA');
                        if (oppTeamWoba != null) {
                            var diff = (1 - oppTeamWoba) * 2;
                            p *= diff;
                        }
                    }
                    else {
                        var wobaSeas = vm.getPlayerMatchupEle(s, 'seasonBatting', 'wOBA');
                        var splits = vm.getPlayerMatchupEle(s, 'splitsBatting', 'wOBA');
                        var woba = 0;
                        var cnt = 0;

                        if (wobaSeas != null && wobaSeas > 0) {
                            woba += (wobaSeas * 3);
                            cnt += 3;
                        }
                        if (splits != null && splits > 0) {
                            woba += splits;
                            cnt++;
                        }

                        if (cnt > 0) {
                            woba /= cnt;
                            p = (woba * 100);
                            needsModAdjust++;
                        }
                    }
                } break;
                case 12: { //MLB Hot Hitters
                    var fppa = vm.getPlayerMatchupEle(s, 'last20Batting', 'FP/PA');
                    if (fppa != null) {
                        p = (fppa * 10);
                    }
                } break;
                case 13: { //TournamentMode
                    p += s.Ceil + lev;
                } break;
                case 14: { //DoubleUps

                    var cnt = 1;

                    if (s.AggProj > 0) {
                        p += s.AggProj;
                        cnt++;
                    }
                    p += s.Floor;
                    p /= cnt;
                    p *= conf;

                } break;
                case 15: { //Vegas
                     //Golf/Nascar/MMA
                    var d = { 5: 'golferInfo', 9: 'pmatchup', 8: 'fight' };
                    var itm = d[vm.Sport];
                    if (itm != null) {
                        p = 0;
                        var odds = vm.getPlayerMatchupEle(s, itm, 'Vegas Odds');
                        if (odds != null) {
                            if (vm.Sport == 8) {
                                if (odds > 0) {
                                    p = 1 - (odds / (odds + 100));
                                } else {
                                    p = odds / (odds - 100);
                                }
                            } else {
                                if (odds > 0) {
                                    p = 100 / (odds + 100);
                                } else {
                                    p = odds / (odds + 100);
                                }
                            }
                            p = LineStarUtility.round(p*100, 2);
                        }
                    }
                } break;
                case 16: { //HighLeverage
                    p = lev;
                } break;
                case 17: { //HighSafety
                    p = safety;
                } break;
                case 18: { //NbaUsage
                    if (p > 10) {
                        var pMins = vm.getPlayerMatchupEle(s, 'gameInfo', 'Proj Mins');
                        var usage = vm.getPlayerMatchupEle(s, (s.STAT == 1) ? 'startersL5' : 'reservesL5', 'Usage');
                        if (pMins != null && usage != null) {
                            p = ((pMins * usage)/10);
                        }
                    }
                } break;
                case 19: { //PgaCourseIndicators
                    var ss = vm.getPlayerMatchupEle(s, 'strokesGainedSeason', 'SG:Total');
                    if (ss != null) {
                        ss = (ss > 185) ? 185 : ss;
                        p = (185 - ss);
                    }
                } break;
                case 20: { //BoomBustRandom
                    if (Math.random() > 0.50) {
                        if (Math.random() > 0.80) {
                            if (s.Ceil > p)
                                p = s.Ceil;
                        }
                    }
                    else {
                        if (Math.random() > 0.60) {
                            p = s.Floor;
                        }
                    }

                } break;
            }

            if (needsModAdjust && s.ProjLocked == 1) {
                var diff = (s.UserPP - s.UneditedPP);
                var pct = (diff / s.UneditedPP);
                p = (p + (p*pct));
            }

            return LineStarUtility.round(vm.ensureNumericFloat(p), 2);
        };

        vm.ensureNumericFloat = function (val) {
            if (typeof val === 'string' || val instanceof String) {
                val = parseFloat(val);
            }
            return val;
        };

        vm.getOptiModelName = function () {
            var n = 'Default';
            switch (vm.generateModelVal) {
                case 1: n = 'Predictable'; break;
                case 2: n = 'HighCeiling'; break;
                case 3: n = 'HighFloor'; break;
                case 4: n = 'StarsAndScrubs'; break;
                case 6: n = 'Random'; break;
                case 5: n = 'PPG'; break;
                case 7: n = 'DailyMatchup'; break;
                case 10: n = 'wOBA'; break;
                case 12: n = 'HotHtters'; break;
                case 13: n = 'Tournament'; break;
                case 14: n = 'DoubleUps'; break;
                case 15: n = 'Vegas'; break;
                case 16: n = 'HighLeverage'; break;
                case 17: n = 'HighSafety'; break;
                case 18: n = 'NbaUsage'; break;
                case 19: n = 'CourseIndicators'; break;
            }
            return n;
        };

        // Shut the panel explicitly rather than leaving it to the
        // .lbMiniFlyoutClose class on the button. ng-click swaps that button's
        // label spans (Optimize -> Optimizing...) before the event bubbles to
        // fscTapOpen, so a click that landed on the WORDS - most of the button -
        // arrives there with a detached e.target, and closest() finds nothing.
        // Same detached-node trap the cascaded rows hit.
        //
        // Covers both Optimize buttons: the one in the panel foot and the one on
        // the toolbar, which is harmless to call when nothing is open.
        vm.closeOptiPanel = function () {
            vm.optiResetArmed = false;   // never leave a primed destructive action behind
            vm.closeOptimizerPanes();
            var el = document.querySelector('.lbMiniSettings.lbMiniTapOpen');
            if (el) { el.classList.remove('is-open'); }
		};

        vm.onStartUIOptimize = function () {
            vm.closeOptiPanel();
            if (vm.usev3Opti) {
                vm.onLineupOptimizeV4(0, null);
            } else {
                vm.onLineupOptimize(0, null)
            }
        };

        vm.onLineupOptimizeV4 = function (swaptimizeSetId, callback) {
            if (!vm.canStartOptimize()) { return; }

            var optObj = {
                slate: vm.selectedSlate,
                lb: vm.lineupBuilder,
                lockedPlayers: Array(vm.lineupBuilder.slots.length).fill(-1),
                lockedDict: {},
                reqs:[],
                ignoreTeams: {},
                games:[],
                posVarCnt: 0,
                varByPosDict: {},
                expByPosDict: {},
                expPosCnt: 0,
                stacks: [],
                maxProj: 0
            };

            for (var i = 0; i < optObj.lb.slots.length; i++) {
                var slot = optObj.lb.slots[i];
                if (slot == null) {
                    vm.showtoast("An error has occured, missing slot information.");
                    return;
                }
     
                if (slot.salary != null) {
                    optObj.lockedPlayers[i] = slot.salary.Id;
                    optObj.lockedDict[slot.salary.Id] = 1;
                }
                
                var r = slot.req;
                var posList = [];
                if (r.Data.activeFilters > 0) {
                    for (var j = 0; j < r.Data.PosList.length; j++) {
                        var pos = r.Data.PosList[j];
                        if (pos.Active) {
                            posList.push(pos.Pos);
                        }
                    }
                }

                if (posList.length == 0)
                {
                    posList = r.Positions.split(',');
                }

                optObj.reqs.push({ positionName: r.PositionName, positionsAllowed: posList, pointMultiplier: r.PointMultiplier, salaryMultiplier: r.SalMult });
            }

            if (vm.periodData.HasTeams) {
                for (var i = 0; i < vm.teamsInSlateForStack.length; i++) {
                    var t = vm.teamsInSlateForStack[i];
                    if (!t.Included && t.Id >= 0) {
                        optObj.ignoreTeams[t.Id] = {};
                    }
                }

                var sg = vm.selectedSlate.SlateGames;
                for (var i = 0; i < sg.length; i++) {
                    var g = vm.GameDict[sg[i].GameId];
                    optObj.games.push({ gameId: g.GameId, homeTeamId: g.HomeTeamId, awayTeamId: g.AwayTeamId, vegasMoneyLineHome: g.VegasMoneyLineHome, vegasMoneyLineAway: g.VegasMoneyLineAway });
                }
            }

            optObj.settings = vm.getOptiSettingsObj();
            optObj.likedProjBoost = optObj.settings.likedprojectionboost.intVal;
            if (optObj.likedProjBoost > 0) {
                optObj.likedProjBoost = (optObj.likedProjBoost / 100);
            }

            optObj.varianceByPosOpt = (optObj.settings.positionvariancelevelmax != null) ? optObj.settings.positionvariancelevelmax.list : null;
            if (optObj.varianceByPosOpt != null) {
                for (var j = 0; j < optObj.varianceByPosOpt.length; j++) {
                    var p = optObj.varianceByPosOpt[j];
                    optObj.varByPosDict[p.Pos] = parseInt(p.Val);
                    optObj.posVarCnt++;
                }
            }

            optObj.expByPosOpt = (optObj.settings.positionexposurelevelmax != null) ? optObj.settings.positionexposurelevelmax.list : null;
            if (optObj.expByPosOpt != null) {
                for (var j = 0; j < optObj.expByPosOpt.length; j++) {
                    var p = optObj.expByPosOpt[j];
                    optObj.expByPosDict[p.Pos] = parseInt(p.Val);
                    optObj.expPosCnt++;
                }
            }

            var ss = optObj.ss = vm.salaryListForSelSlateALL;
            ss.sort(function (b, a) {
                return a.LoveCount - b.LoveCount;
            });
            for (var i = 0; i < optObj.ss.length; i++) {
                ss[i].FanSenseLiked = (ss[i].LoveCount > 0 && i < 10);
            }
            ss.sort(function (b, a) {
                return a.HateCount - b.HateCount;
            });
            for (var i = 0; i < ss.length; i++) {
                ss[i].FanSenseExcluded = (ss[i].HateCount > 0 && i < 10);
            }

            optObj.players = vm.getPlayersListForOptimize(optObj);

            for (var i = 0; i < vm.stackOptions.length; i++) {
                var stk = vm.stackOptions[i];
                if (!stk.enabled) { continue; }
                var opt = { teamExposure: [], teams: [], stackSize: stk.stackSize, positionsAllowed: [], maxOpposingTeamPlayers: 0 };

                if (stk.stackSize > optObj.settings.maxplayersperteam.intVal) {
                    optObj.settings.maxplayersperteam.intVal = stk.stackSize;
                    vm.showtoast('Increased max players per team setting, as stack size exceeds it.');
                }

                for (const [key, value] of Object.entries(stk.teams)) {
                    var exp = LineStarUtility.ensureNumeric(value);
                    if (!(exp > 0 && exp <= 100)) {
                        exp = 0;
                    }
                    opt.teamExposure.push(exp);
                    opt.teams.push(parseInt(key));
                }
                for (var j = 0; j < stk.options.length; j++) {
                    var op = stk.options[j];
                    switch (op.Id) {
                        case "stacking_nhl_maxdefencemen":
                            opt.maxDefenders = op.Value1;
                            break;
                        case "stacking_nhl_linerange":
                            opt.hockeyLineMin = op.Value1;
                            opt.hockeyLineMax = op.Value2;
                            break;
                        case "stacking_mlb_lineuporder":
                            opt.battingRangeMin = op.Value1;
                            opt.battingRangeMax = op.Value2;
                            break;
                        case "stacking_mlb_gapsize":
                            opt.gapSize = op.Value1;
                            break;
                        case "stacking_general_gamestack":
                            opt.maxOpposingTeamPlayers = op.Value1;
                            break;
                        case "stacking_general_salaryrange":
                            opt.minSalary = op.Value1;
                            opt.maxSalary = op.Value2;
                            break;
                        case "stacking_general_minprojection":
                            opt.minProjection = op.Value1;
                            opt.maxProjection = 0;// (vm.generateModelVal == 0) ? op.Value2 : (optObj.maxProj + 1);
                            break;
                        case "stacking_general_ownershiprange":
                            opt.minOwnership = op.Value1;
                            opt.maxOwnership = op.Value2;
                            break;
                        case "stacking_general_stackedteamonly":
                            opt.limitTeamStack = (op.Value1 == 1);
                            break;
                    }
                }
                for (var j = 0; j < stk.possiblePositions.length; j++) {
                    var pos = stk.possiblePositions[j];
                    if (pos.included) {
                        opt.positionsAllowed.push(pos.PositionName);
                    }
                }

                if (opt.positionsAllowed.length == 0) {
                    vm.showtoast('ERROR: A stack had no positions selected');
                } else {
                    optObj.stacks.push(opt);
                }
            }

            var lineupsToOpt = optObj.settings.variablelineupcount.intVal;
            if (lineupsToOpt < 1) {
                lineupsToOpt = 1;
            }
            if (lineupsToOpt > 150) {
                lineupsToOpt = 150;
            }
            optObj.lineupsToOpt = lineupsToOpt;

            var mppt = optObj.reqs.length;
            if (optObj.settings.maxplayersperteam != null) {
                mppt = optObj.settings.maxplayersperteam.intVal;
            }
            if (optObj.slate.Restriction_MaxPlayersPerTeam > 1 && mppt > optObj.slate.Restriction_MaxPlayersPerTeam) {
                mppt = optObj.slate.Restriction_MaxPlayersPerTeam;
            }

            if (vm.periodData.HasTeams) {
                var tc = (optObj.games.length * 2);
                var c = 0;
                while ((mppt * tc) < optObj.reqs.length) {
                    mppt++;
                    c++;
                }
                if (c) {
                    vm.showtoast('Increased max players per team to allow lineups to be optimized.');
                }
            }

            var safe = false;
            if (optObj.settings.safematchup != null) {
                safe = optObj.settings.safematchup.boolVal;
            }

            optObj.lineupsToOpt = lineupsToOpt;
            optObj.optiModelName = vm.getOptiModelName();
            optObj.v4Settings = {
                userId: LineStar.UserID, site: vm.Site, sport: vm.Sport, mode: optObj.slate.Mode, num_lineups: lineupsToOpt, budget: optObj.settings.maxbudget.intVal, min_budget: optObj.settings.minbudgetusage.intVal,
                unique_players: optObj.settings.minUniquePlayers.intVal, max_exposure: optObj.settings.exposuremax.intVal, stack_count: 0, stack_size: 0, max_players_per_team: mppt,
                lockedPlayers: optObj.lockedPlayers, requirementList: optObj.reqs, stacks: optObj.stacks, safeMatchup: safe, source: 0,
                minOwnPercentage: optObj.settings.playerownershiprange.min, maxOwnPercentage: optObj.settings.playerownershiprange.max, games: optObj.games, minTeamsRequirement: optObj.slate.Restriction_MinTeams, minGamesRequirement: optObj.slate.Restriction_MinGames,
                // Additive: classic team stacks stay in `stacks` above, untouched.
                // Only ACTIVE groups are sent; [] means the feature is unused.
                playerGroups: vm.getActivePlayerGroupsPayload(),
                // Position Stacks (doc §2.1). Active rules only, with teamIds
                // resolved from the authored abbreviations.
                positionStacks: vm.getActivePositionStacksPayload()
            };

            // Preflight. Runs HERE rather than next to the pool build because it
            // needs lineupsToOpt and v4Settings (max players per team) - the
            // exposure and team-count checks are meaningless without them.
            //
            // Replaces a bare `players.length == 0` guard whose one message
            // ("no players were available... take a look at your settings") sent
            // people hunting through every setting on the page. `blocking` means
            // provably impossible, so we don't spend a round trip on it;
            // `warnings` are stashed for the shortfall message if the run comes
            // back light.
            var pre = vm.preflightOptimize(optObj);
            optObj.preflightWarnings = pre.warnings;

            if (pre.blocking.length && !vm.optiForceNext) {
                vm.showErrorDialog('These settings cannot produce a lineup',
                    vm.formatOptiIssues(pre.blocking, 4), {
                        actionLabel: 'Optimize anyway',
                        action: function () { vm.optiForceNext = true; vm.onStartUIOptimize(); }
                    });
                return;
            }
            // one-shot override, cleared the moment it is honoured
            vm.optiForceNext = false;


            vm.optiStopped = false;
            vm.optimizingLineups = 1;
            vm.lastOptimizeTime = new Date();
            vm.showLineupBuilder = 0;

            // Streaming IS the optimizer now - there is no separate version
            // choice. usev3Opti stays the only switch (it also drives the Max Exp
            // column) and selects this whole path.
            // The buffered call below survives purely as a capability fallback
            // for a browser without fetch/TextDecoder, and the stream parser
            // still understands a legacy one-shot {"lineups":[...]} response if
            // the server ever rolls back.
            if (typeof fetch === 'function' && typeof TextDecoder === 'function') {
                // swaptimizeSetId was accepted and then ignored here for as long
                // as this function has existed - V4 silently ran a NORMAL
                // optimize when asked to swap a set. It routes now.
                var swapSet = (swaptimizeSetId > 0) ? vm.findSetByLocalId(swaptimizeSetId) : null;
                if (swapSet != null) { vm.runLateSwapV4(optObj, swapSet); }
                else { vm.runOptimizeV4Stream(optObj); }
                return;
            }

            // open the lineups dialog only after the optimize finishes (below)

            /*if (vm.generateModelVal == 20) {
                vm.runChunkedOptimize(optObj);
                return;
            }*/

            webService.optimizeLineupsBuffered(function (success, data) {
                if (success) {
                    if (data == null || data.lineups == null || data.lineups.length == 0) {
                        success = false;
                    }
                }
                if (success) {
                    sucess = vm.convertLineupsToSet(data.lineups, optObj);
                    vm.openLineupsDialog();   // lineups are ready - now show them
                }
                if (!success) {
                    vm.showErrorDialog('Error while optimizing.', "The optimizer didn't produce any lineups because the settings might be too restrictive or conflicting. Review and adjust your settings, or reset them if you can't identify the problem.");
                }
                vm.optimizingLineups = 0;
                if (!$scope.$$phase) { $scope.$apply(); }
            }, optObj.players, optObj.v4Settings);
        };

        // One lineup, from an array of SALARY ids. Extracted from
        // convertLineupsToSet so the streaming path can build them one at a
        // time as they arrive rather than only in a finished batch.
        // Returns null when the server's lineup doesn't match the slate's
        // requirement list (the same guard the batch path had).
        // ── V4 streaming run ────────────────────────────────────────────────
        // Same optObj the buffered path builds; only the transport and the rendering
        // differ. The set is created and shown BEFORE any lineup arrives, then
        // filled in as the server solves - that's the whole point of streaming.
        vm.optiStreamJobId = null;
        vm.optiStreamAbort = null;
        vm.optiStreamCount = 0;     // lineups delivered so far - bound in the UI
        vm.optiStreamTarget = 0;    // lineups requested, for "15 of 50"

        vm.runOptimizeV4Stream = function (optObj) {
            var salDictForSlate = vm.salariesPerSlate[optObj.slate.Id];
            var now = new Date();
            var jobId = vm.optiStreamJobId = vm.newOptiJobId();
            var issues = [];

            vm.optiStreamAbort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
            vm.optiStreamCount = 0;
            vm.optiStreamTarget = optObj.lineupsToOpt;

            var set = vm.onCreateEmptyLineupSet(1);
            set.SetInfo.SetName = 'V4 ' + optObj.optiModelName + ' Set';
            set.SetInfo.Model = vm.generateModelVal;
            set.Lineups = [];
            set.needsSave = 1;
            // guards saveSetChanges from persisting this set while it fills
            set.isStreaming = 1;
            vm.lineupsDialogSet = set;
            // MUST come before openLineupsDialog: that calls
            // ensureSelectedLineupSet, which keeps the current selection only if
            // it appears in selectedSlateSets - a DERIVED list rebuilt here. The
            // set was just pushed to periodData.Sets, so without this rebuild it
            // isn't in the derived list yet and the selection falls through to
            // "most recent", landing the user on some older set.
            vm.updateLineupSetCounts();
            vm.openLineupsDialog();   // open EMPTY - lineups land in it live

            // Lines arrive outside Angular and a 150-lineup run would mean 150
            // digests on a page with a very large watch count. Buffer and flush
            // on a frame instead.
            var pending = [];
            var flushQueued = false;

            function flush() {
                flushQueued = false;
                if (!pending.length) { return; }
                for (var i = 0; i < pending.length; i++) { set.Lineups.push(pending[i]); }
                pending.length = 0;
                vm.optiStreamCount = set.Lineups.length;
                try {
                    if (localStorage.getItem('optiStreamDebug') === '1') {
                        console.log('[opti render] now showing ' + set.Lineups.length);
                    }
                } catch (e) { }
                vm.processLineupSetStatsSet(set);
                // the picker subtitle and the "x / y" totals are derived, so they
                // only move if this runs too. rAF-throttled, and lines land about
                // twice a second, so it is not a hot path.
                vm.updateLineupSetCounts();
                if (!$scope.$$phase) { $scope.$apply(); }
            }

            function queueFlush() {
                if (flushQueued) { return; }
                flushQueued = true;
                if (window.requestAnimationFrame) { requestAnimationFrame(flush); }
                else { setTimeout(flush, 16); }
            }

            function finish(res) {
                flush();
                vm.optimizingLineups = 0;
                vm.optiStreamJobId = null;
                vm.optiStreamAbort = null;
                // the run is over - this set is savable again
                set.isStreaming = 0;

                if (set.Lineups.length > 0) {
                    vm.processLineupSetStatsSet(set);
                    vm.saveSetChanges_debounce();
                } else {
                    // nothing to keep - drop the empty set we opened with, or it
                    // lingers in the picker as a phantom "V4 ... Set" with 0 lineups
                    var si = vm.periodData.Sets.indexOf(set);
                    if (si >= 0) { vm.periodData.Sets.splice(si, 1); }
                    if (vm.lineupsDialogSet === set) { vm.lineupsDialogSet = null; }
                }

                if (!$scope.$$phase) { $scope.$apply(); }

                if (res == null) { return; }

                // A stopped run explains its own shortfall. None of the
                // diagnosis below applies: not the truncation error (the abort
                // can beat the terminal line and look like a dropped socket),
                // not the no-lineups post-mortem, and not the over-constrained
                // breakdown. The user ended it; just say so.
                if (res.status === 'cancelled' || vm.optiStopped) {
                    var stoppedAt = set.Lineups.length + pending.length;
                    vm.showtoast(stoppedAt > 0
                        ? 'Stopped after ' + stoppedAt + ' lineup' + (stoppedAt === 1 ? '' : 's') + '.'
                        : 'Optimize stopped.');
                    return;
                }

                if (res.truncated) {
                    vm.showErrorDialog('Optimizer connection lost.',
                        'The optimizer reported ' + res.count + ' lineups but only ' + res.received +
                        ' arrived, so the run was cut short. The lineups you did receive have been kept.');
                    return;
                }

                if (set.Lineups.length === 0) {
                    // Preflight said this config was possible, so something
                    // tighter than our checks can see stopped it. Lead with
                    // whatever the server said, then our warnings, then the
                    // pool tally - anything is better than "review your
                    // settings" with no direction.
                    var zr = [];
                    for (var zi = 0; zi < issues.length; zi++) { zr.push(issues[zi]); }
                    var zsrv = vm.collectOptiIssues(res, optObj);
                    for (var zs = 0; zs < zsrv.length; zs++) { zr.push(zsrv[zs]); }
                    for (var zw = 0; zw < (optObj.preflightWarnings || []).length; zw++) {
                        zr.push(optObj.preflightWarnings[zw]);
                    }
                    if (!zr.length) {
                        var zwhy = vm.describePoolDrops(optObj, 3);
                        if (zwhy) { zr.push('The player pool was cut down by: ' + zwhy + '.'); }
                    }

                    vm.showErrorDialog('No lineups could be built',
                        zr.length
                            ? 'The optimizer could not satisfy every setting at once.\n\nMost likely causes:\n' +
                              vm.formatOptiIssues(zr, 4)
                            : "The optimizer didn't produce any lineups because the settings might be too restrictive or conflicting. Review and adjust your settings, or reset them if you can't identify the problem.");
                    return;
                }

                // requested > count is ADVISORY, not a failure: an
                // over-constrained config legitimately can't fill the order.
                // But "built 31 of 50" on its own is useless - so pair it with
                // the constraints that are actually tight, from our own
                // preflight warnings plus whatever the server diagnosed in
                // issues[]. Server codes come first: it knows why it stopped.
                //
                // A cancelled run never reaches here - it returned above.
                // Server issues are read REGARDLESS of the count. A run can be
                // full and still carry an advisory - a player group whose ids are
                // not on this slate is skipped and reported with every lineup
                // delivered. Gating this on requested > count threw those away
                // silently (errors doc §5).
                var srvReasons = vm.collectOptiIssues(res, optObj);

                if (res.requested > res.count) {
                    var reasons = srvReasons.slice();   // server first: it knows why it stopped

                    for (var wi = 0; wi < (optObj.preflightWarnings || []).length; wi++) {
                        reasons.push(optObj.preflightWarnings[wi]);
                    }

                    // nothing specific to say - fall back to the pool tally,
                    // which at least names the filters doing the most cutting
                    if (!reasons.length) {
                        var why = vm.describePoolDrops(optObj, 3);
                        if (why) {
                            reasons.push('The player pool was cut down by: ' + why +
                                '. Loosening one of those gives the optimizer more to work with.');
                        }
                    }

                    if (reasons.length) {
                        vm.showErrorDialog('Built ' + res.count + ' of ' + res.requested + ' lineups',
                            'The optimizer ran out of valid combinations before filling the order. ' +
                            'The lineups it did build have been kept.\n\nMost likely causes:\n' +
                            vm.formatOptiIssues(reasons, 4));
                    } else {
                        vm.showtoast('Built ' + res.count + ' of ' + res.requested +
                                     ' lineups - the settings ran out of valid combinations.');
                    }
                } else if (srvReasons.length) {
                    // Full count, but the server flagged something - a rule it could
                    // not apply, a group it had to skip. The run succeeded, so this
                    // is a notice, not an error.
                    vm.showErrorDialog('Built ' + res.count + ' lineup' + (res.count === 1 ? '' : 's'),
                        'Every lineup you asked for was built. The optimizer had notes:\n' +
                        vm.formatOptiIssues(srvReasons, 4),
                        { tone: 'notice' });
                }
            }

            webService.optimizeLineupsV4Stream(optObj.players, optObj.v4Settings, jobId, {
                onLineup: function (ids) {
                    var lu = vm.buildLineupFromIds(ids, optObj.optiModelName + ' ' + (set.Lineups.length + pending.length + 1),
                                                   optObj, salDictForSlate, now);
                    if (lu != null) { pending.push(lu); queueFlush(); }
                },
                onBatch: function (lineups) {
                    // server ran the old buffered path - deliver it all at once
                    for (var i = 0; i < lineups.length; i++) {
                        var lu = vm.buildLineupFromIds(lineups[i], optObj.optiModelName + ' ' + (i + 1), optObj, salDictForSlate, now);
                        if (lu != null) { pending.push(lu); }
                    }
                    queueFlush();
                },
                onIssue: function (msg) {
                    // in-band error: recorded, NOT fatal - the terminal line
                    // still follows and partial results are kept
                    issues.push(msg);
                },
                onEnd: finish,
                onFail: function (msg) {
                    issues.push(msg);
                    finish({ status: 'failed', count: set.Lineups.length + pending.length,
                             requested: optObj.lineupsToOpt, issues: [], received: set.Lineups.length + pending.length,
                             truncated: false });
                }
            }, vm.optiStreamAbort ? vm.optiStreamAbort.signal : null)
            .catch(function (err) {
                // an abort lands here too; finish() is idempotent via optimizingLineups
                if (vm.optimizingLineups !== 1) { return; }
                issues.push((err && err.message) ? err.message : 'The optimizer request failed.');
                finish({ status: 'failed', count: set.Lineups.length + pending.length,
                         requested: optObj.lineupsToOpt, issues: [],
                         received: set.Lineups.length + pending.length, truncated: false });
            });
        };

        // Stop button. Aborts the stream AND posts the cancel so the server
        // stops between solves and logs it; already-delivered lineups are kept.
        // The Stop button is the one thing we know locally. The server's
        // "cancelled" terminal line races the abort() below, so on a slow
        // round-trip the reader can die first and the run looks like a dropped
        // connection. This flag makes the outcome depend on intent, not timing.
        vm.optiForceNext = false;   // 'Optimize anyway' past a blocking preflight
        vm.optiStopped = false;

        // ══ Late swap on V4 (§3) ══════════════════════════════════════════════
        // Classic hands the server a LocalSetId and lets it decide, from game
        // times alone, which players may move. V4 sends the lineups themselves
        // with an explicit lock per slot, which is what makes the per-game lock
        // list mean anything: a game the user locked by hand freezes its players
        // even though the clock says they are still swappable.

        vm.findSetByLocalId = function (localId) {
            var sets = (vm.periodData != null) ? vm.periodData.Sets : null;
            for (var i = 0; i < (sets || []).length; i++) {
                if (sets[i].SetInfo != null && sets[i].SetInfo.LocalId == localId) { return sets[i]; }
			}
            return null;
		};

        // gameId -> 1 for every game currently locked, from the phase-4 list.
        vm.swapLockedGameSet = function () {
            var out = {};
            for (var i = 0; i < vm.swapGames.length; i++) {
                if (vm.swapGames[i].locked) { out[vm.swapGames[i].gameId] = 1; }
			}
            return out;
		};

        // One {entryId, locked[]} per lineup. locked[] runs in slot order: a
        // salary id freezes that slot, -1 opens it for re-optimizing.
        vm.buildLateSwapPayload = function (set) {
            var lockedGames = vm.swapLockedGameSet();
            var salDict = vm.salariesPerSlate[set.SetInfo.SlateId] || {};
            var out = [], byKey = {}, frozen = 0, open = 0;

            for (var i = 0; i < set.Lineups.length; i++) {
                var l = set.Lineups[i];
                var locked = [];

                for (var j = 0; j < l.LineupItems.length; j++) {
                    var li = l.LineupItems[j];
                    var sid = (li != null) ? li.SalaryId : 0;
                    var sal = (sid > 0) ? salDict[sid] : null;

                    // An unresolved slot is left OPEN: freezing an id we cannot
                    // identify would hand the server a player it may not have in
                    // the pool, and the whole entry comes back infeasible.
                    if (sal == null) { locked.push(-1); open++; continue; }

                    if (lockedGames[sal.GID]) { locked.push(sid); frozen++; }
                    else { locked.push(-1); open++; }
				}

                // entryId is opaque and only has to come back unchanged, but it
                // MUST be unique (§3.4) - two lineups sharing one would have the
                // second result overwrite the first. The lineup's own name is
                // "entryId:contestId" and unique for an imported set, but a
                // hand-built or merged set carries no such promise, so the index
                // goes in front. Readable in a log, unique by construction.
                var key = i + '|' + String(l.Name);
                byKey[key] = l;

                out.push({ entryId: key, locked: locked });
			}

            return { lineups: out, byKey: byKey, frozen: frozen, open: open };
		};

        vm.runLateSwapV4 = function (optObj, srcSet) {
            var salDictForSlate = vm.salariesPerSlate[optObj.slate.Id];
            var now = new Date();
            var jobId = vm.optiStreamJobId = vm.newOptiJobId();
            var issues = [];

            var payload = vm.buildLateSwapPayload(srcSet);
            if (!payload.lineups.length) {
                vm.optimizingLineups = 0;
                vm.showtoast('That set has no lineups to swap.');
                return;
			}
            if (payload.open === 0) {
                vm.optimizingLineups = 0;
                vm.showtoast('Every slot in this set is locked, so there is nothing to swap.');
                return;
			}

            // Per-lineup locks replace the global ones - §3.1 is explicit that
            // settings.lockedPlayers goes up empty for a late swap, or the two
            // fight each other.
            optObj.v4Settings.lockedPlayers = [];

            vm.optiStreamAbort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
            vm.optiStreamCount = 0;
            vm.optiStreamTarget = payload.lineups.length;

            // Results are matched back by entryId, so the destination set keeps
            // each lineup's name - that name is the link to the DFS entry and
            // losing it would make the swapped set un-exportable.
            var set = vm.onCreateEmptyLineupSet(1);
            set.SetInfo.SetName = vm.lateSwapSetName(srcSet);
            set.SetInfo.Model = vm.generateModelVal;
            set.Lineups = [];
            set.needsSave = 1;
            set.isStreaming = 1;
            vm.lineupsDialogSet = set;
            vm.updateLineupSetCounts();
            vm.openLineupsDialog();

            // built alongside the payload so the two cannot drift apart
            var byEntry = payload.byKey;

            var pending = [];
            var flushQueued = false;
            var entryErrors = [];

            function flush() {
                flushQueued = false;
                if (!pending.length) { return; }
                for (var i = 0; i < pending.length; i++) { set.Lineups.push(pending[i]); }
                pending.length = 0;
                vm.optiStreamCount = set.Lineups.length;
                vm.processLineupSetStatsSet(set);
                vm.updateLineupSetCounts();
                if (!$scope.$$phase) { $scope.$apply(); }
			}

            function queueFlush() {
                if (flushQueued) { return; }
                flushQueued = true;
                if (window.requestAnimationFrame) { requestAnimationFrame(flush); }
                else { setTimeout(flush, 16); }
			}

            function finish(res) {
                flush();
                vm.optimizingLineups = 0;
                vm.optiStreamJobId = null;
                vm.optiStreamAbort = null;
                set.isStreaming = 0;

                if (!set.Lineups.length) {
                    // nothing came back - drop the empty set rather than leave it
                    var idx = vm.periodData.Sets.indexOf(set);
                    if (idx >= 0) { vm.periodData.Sets.splice(idx, 1); }
                    vm.updateLineupSetCounts();
                    vm.showErrorDialog('No lineups could be swapped',
                        'The optimizer could not fill the open slots in any of these lineups.' +
                        (issues.length ? ('\n\nMost likely causes:\n' + vm.formatOptiIssues(issues, 4)) : ''));
                    if (!$scope.$$phase) { $scope.$apply(); }
                    return;
				}

                set.needsSave = 1;
                vm.saveSetChanges_debounce();

                // Only now is it safe to drop the original: the swap succeeded
                // and its replacement is saved.
                if (!vm.swaptimizeNewSet) {
                    var si = vm.periodData.Sets.indexOf(srcSet);
                    if (si >= 0) { vm.periodData.Sets.splice(si, 1); }
                    vm.updateLineupSetCounts();
				}

                var short = payload.lineups.length - set.Lineups.length;
                if (short > 0 || entryErrors.length) {
                    vm.showErrorDialog('Swapped ' + set.Lineups.length + ' of ' + payload.lineups.length + ' lineups',
                        short + ' lineup' + (short === 1 ? ' could' : 's could') + ' not be re-optimized with the slots you left open. ' +
                        'They have been left out of the new set - the originals are untouched.' +
                        (issues.length ? ('\n\nMost likely causes:\n' + vm.formatOptiIssues(issues, 4)) : ''),
                        { tone: 'notice' });
				} else {
                    vm.showtoast('Swapped ' + set.Lineups.length + ' lineup' + (set.Lineups.length === 1 ? '' : 's') + '.');
				}

                if (!$scope.$$phase) { $scope.$apply(); }
			}

            webService.optimizeLineupsV4Stream(optObj.players, optObj.v4Settings, jobId, {
                onLineup: function (ids, entryId) {
                    // Without an entryId there is nothing to match the result to,
                    // and guessing by arrival order would silently write one
                    // entry's lineup into another's row.
                    var src = (entryId != null) ? byEntry[String(entryId)] : null;
                    if (src == null) { issues.push('A swapped lineup came back without a matching entry.'); return; }

                    var lu = vm.buildLineupFromIds(ids, src.Name, optObj, salDictForSlate, now);
                    if (lu == null) { return; }

                    // carry the entry link and the contest info across
                    lu.Name = src.Name;
                    lu.ContestName = src.ContestName;
                    lu.ContestId = src.ContestId;
                    lu.EntryId = src.EntryId;

                    pending.push(lu);
                    queueFlush();
				},
                onBatch: function (lineups) {
                    // a legacy one-shot response carries no entryIds, so slot
                    // them back in request order - the only correlation left
                    for (var i = 0; i < lineups.length; i++) {
                        var src = srcSet.Lineups[i];
                        if (src == null) { continue; }
                        var lu = vm.buildLineupFromIds(lineups[i], src.Name, optObj, salDictForSlate, now);
                        if (lu == null) { continue; }
                        lu.Name = src.Name;
                        lu.ContestName = src.ContestName;
                        lu.ContestId = src.ContestId;
                        lu.EntryId = src.EntryId;
                        pending.push(lu);
					}
                    queueFlush();
				},
                onEntryError: function (entryId, msg) {
                    entryErrors.push(entryId);
                    if (issues.indexOf(msg) < 0) { issues.push(msg); }
				},
                onIssue: function (msg) { issues.push(msg); },
                onEnd: finish,
                onFail: function (msg) {
                    issues.push(msg);
                    finish({ status: 'failed', count: set.Lineups.length + pending.length });
				}
			}, vm.optiStreamAbort ? vm.optiStreamAbort.signal : null, { lineups: payload.lineups })
            .catch(function (err) {
                if (vm.optimizingLineups !== 1) { return; }
                issues.push((err && err.message) ? err.message : 'The swap request failed.');
                finish({ status: 'failed', count: set.Lineups.length + pending.length });
			});
		};

        // Keeps #Import# at the front - onExportSet keys off it to offer the
        // ID-linked export, and a swapped set is exactly the one you want to
        // send back to the site.
        vm.lateSwapSetName = function (srcSet) {
            var n = String((srcSet && srcSet.SetInfo && srcSet.SetInfo.SetName) || 'Swapped set');
            if (n.indexOf(' (swapped)') >= 0) { return n; }       // swapping a swap
            var out = n + ' (swapped)';
            return (out.length <= 60) ? out : (n.substring(0, 60 - 10).trim() + ' (swapped)');
		};

        vm.stopOptimize = function () {
            vm.optiStopped = true;
            if (vm.optiStreamJobId) { webService.cancelOptimizeV4(vm.optiStreamJobId); }
            if (vm.optiStreamAbort) { try { vm.optiStreamAbort.abort(); } catch (e) { } }
        };

        vm.buildLineupFromIds = function (list, name, optObj, salDictForSlate, now) {
            if (optObj.reqs.length != list.length) {
                console.log('Invalid lineup length -- does not match req list.');
                return null;
            }

            var lis = [];
            var lineup = { IsWatched: false, Name: name, Owned: 0, PP: 0, PS: 0, PeriodId: LineStar.PeriodId, Projection: 0, Created: now.toISOString(), ReadableTime: '', Salary: 0, Scored: 0, Site: vm.Site, SlateId: optObj.slate.Id, Sport: vm.Sport };

            for (var j = 0; j < list.length; j++) {
                var sal = salDictForSlate[list[j]];
                if (sal == null) { return null; }
                lis.push({ Id: 0, ItemOrder: 0, LineupId: 0, PlayerId: 0, Position: null, Projection: 0, Salary: sal, SalaryId: sal.Id, req: optObj.slate.LineupRequirements[j] });
            }

            if (optObj.settings.flexlateplayers.boolVal) {
                for (var j = 0; j < lis.length; j++) {
                    if (optObj.lockedPlayers[j] > 0) { continue; }
                    var li1 = lis[j];
                    var req1 = optObj.slate.LineupRequirements[j]

                    for (var k = 0; k < lis.length; k++) {
                        var li2 = lis[k];
                        var req2 = optObj.slate.LineupRequirements[k];
                        if (optObj.lockedPlayers[k] > 0 || k == j || req1.PositionName == req2.PositionName || req1.Data.PosList.length >= req2.Data.PosList.length || req2.SalMult != req1.SalMult || req2.PointMultiplier != req1.PointMultiplier) { continue; }

                        if (LineStarUtility.parseTime2(li1.Salary.GT) > LineStarUtility.parseTime2(li2.Salary.GT) &&
                            vm.doesPlayerFitIntoSlot(li2, li1.Salary, 1) && vm.doesPlayerFitIntoSlot(li1, li2.Salary, 1)) {
                            var temp = li1.Salary;
                            lis[j].Salary = li2.Salary;
                            lis[k].Salary = temp;
                        }
                    }
                }
            }

            lineup.LineupItems = lis;
            return lineup;
        };

        vm.convertLineupsToSet = function (data, optObj) {
            var lineups = [];
            var salDictForSlate = vm.salariesPerSlate[optObj.slate.Id];
            var now = new Date();
            var success = false;

            if (data.length != optObj.lineupsToOpt) {
                // Same diagnosis as the streaming path - the buffered fallback
                // shouldn't be the one that still says nothing useful.
                var bReasons = (optObj.preflightWarnings || []).slice();
                if (!bReasons.length) {
                    var bWhy = vm.describePoolDrops(optObj, 3);
                    if (bWhy) { bReasons.push('The player pool was cut down by: ' + bWhy + '.'); }
                }

                if (bReasons.length) {
                    vm.showErrorDialog('Built ' + data.length + ' of ' + optObj.lineupsToOpt + ' lineups',
                        'The optimizer ran out of valid combinations before filling the order. ' +
                        'The lineups it did build have been kept.\n\nMost likely causes:\n' +
                        vm.formatOptiIssues(bReasons, 4));
                } else {
                    vm.showtoast('Built ' + data.length + ' of ' + optObj.lineupsToOpt + ' lineups.');
                }
            }

            for (var i = 0; i < data.length; i++) {
                // shared with the streaming path (buildLineupFromIds) so the two
                // can't drift on flex swapping or item shape
                var lineup = vm.buildLineupFromIds(data[i], optObj.optiModelName + ' ' + (i + 1), optObj, salDictForSlate, now);
                if (lineup != null) { lineups.push(lineup); }
            }
            if (lineups.length > 0) {
                var set = vm.onCreateEmptyLineupSet(1);
                set.SetInfo.SetName = 'V4 ' + optObj.optiModelName + ' Set';
                set.SetInfo.Model = vm.generateModelVal;
                set.Lineups = lineups;
                set.needsSave = 1;
                vm.processLineupSetStatsSet(set);
                vm.saveSetChanges_debounce();
                // land the user on the freshly-optimized set; the lineupsDialogSet
                // watch flashes the picker + animates the body so the switch is obvious.
                vm.lineupsDialogSet = set;
            } else {
                success = false;
            }

            return success;
        };
        // ── Optimizer preflight & shortfall diagnostics ──────────────────────
        // Two jobs:
        //   1. Catch provably-impossible configs BEFORE sending, and say which
        //      setting made them impossible.
        //   2. When the server returns fewer lineups than asked for, name the
        //      constraints most likely to be responsible.
        // Everything here works off data we already have client-side.

        // Human labels for the pool-drop tally (see getPlayersListForOptimize).
        vm.poolDropLabels = {
            noProjection:   'no projection',
            excluded:       'being excluded (or FanSense-excluded)',
            teamFilter:     'their team being filtered out',
            likedOnly:      'the "liked players only" pool',
            battingOrder:   'the batting-order limit',
            powerPlayLine:  'the power-play line filter',
            defenseLine:    'the max defense line',
            offenseLine:    'the max offense line',
            startersOnly:   'the "starters only" filter',
            injured:        'the "no injured players" filter',
            minProjection:  'the minimum projection',
            ownershipRange: 'the ownership range',
            minSalary:      'the minimum salary',
            // three ways to reach a max exposure of 0, and three different fixes
            maxExpZero:         'max exposure being 0',
            positionMaxExpZero: 'a per-position max exposure of 0',
            playerMaxExpZero:   'their own max exposure being 0'
        };

        vm.poolDropTotal = function (optObj) {
            var drops = (optObj != null) ? (optObj.poolDrops || {}) : {};
            var n = 0;
            for (var k in drops) {
                if (Object.prototype.hasOwnProperty.call(drops, k)) { n += drops[k]; }
			}
            return n;
		};

        // Biggest causes first - the ordering is the point, it puts the setting
        // worth loosening at the front of the sentence.
        vm.describePoolDrops = function (optObj, limit) {
            var drops = optObj.poolDrops || {};
            var list = [];
            for (var k in drops) {
                if (!Object.prototype.hasOwnProperty.call(drops, k)) { continue; }
                list.push({ k: k, n: drops[k] });
            }
            list.sort(function (a, b) { return b.n - a.n; });

            var parts = [];
            var max = limit || 3;
            for (var i = 0; i < list.length && i < max; i++) {
                var label = vm.poolDropLabels[list[i].k] || list[i].k;
                parts.push(list[i].n + ' by ' + label);
            }
            return parts.join(', ');
        };

        // How many pool players can fill each distinct roster slot type.
        vm.checkPositionCoverage = function (optObj) {
            var reqs = optObj.reqs || [];
            var pool = optObj.players || [];
            var out = [];

            // how many slots in ONE lineup want each position group
            var slotDemand = {};
            for (var i = 0; i < reqs.length; i++) {
                var k = reqs[i].positionsAllowed.join('/');
                slotDemand[k] = (slotDemand[k] || 0) + 1;
            }

            var seen = {};
            for (var r = 0; r < reqs.length; r++) {
                var req = reqs[r];
                var key = req.positionsAllowed.join('/');
                if (seen[key]) { continue; }
                seen[key] = 1;

                var n = 0;
                for (var p = 0; p < pool.length; p++) {
                    if (vm.doesPositionMatch(pool[p].positions, req.positionsAllowed)) { n++; }
                }

                out.push({ name: req.positionName, positions: key, eligible: n, needed: slotDemand[key] });
            }
            return out;
        };

        // Provably impossible, or merely tight? `blocking` stops the run and
        // names the cause; `warnings` feed the shortfall message.
        vm.preflightOptimize = function (optObj) {
            var res = { blocking: [], warnings: [] };
            var os = optObj.settings;
            var pool = optObj.players || [];
            var reqs = optObj.reqs || [];
            var lineups = optObj.lineupsToOpt || 1;
            var rosterSize = reqs.length;

            if (!pool.length) {
                var why = vm.describePoolDrops(optObj, 3);
                res.blocking.push('No players are available to optimize with.' +
                    (why ? ' Players were removed by: ' + why + '.' : ''));
                return res;   // nothing else is meaningful against an empty pool
            }

            // ---- every roster slot needs eligible players --------------------
            var cover = vm.checkPositionCoverage(optObj);
            for (var i = 0; i < cover.length; i++) {
                var c = cover[i];
                if (c.eligible === 0) {
                    res.blocking.push('No available player can fill the ' + c.name + ' slot (' + c.positions + ').');
                } else if (c.eligible < c.needed) {
                    res.blocking.push('Only ' + c.eligible + ' player' + (c.eligible === 1 ? '' : 's') +
                        ' can fill ' + c.name + ', but each lineup needs ' + c.needed + '.');
                } else if (c.eligible <= c.needed + 1) {
                    res.warnings.push('Only ' + c.eligible + ' players can fill ' + c.name +
                        ', so nearly every lineup has to use the same ones.');
                }
            }

            // ---- salary window ------------------------------------------------
            // A TRUE bound: the N cheapest players in the pool ignoring position.
            // If even that cannot fit the cap, no lineup can - so this can never
            // raise a false alarm.
            if (rosterSize > 0 && rosterSize <= pool.length) {
                var sals = [];
                for (var s = 0; s < pool.length; s++) { sals.push(pool[s].salary || 0); }
                sals.sort(function (a, b) { return a - b; });

                var cheapest = 0, dearest = 0;
                for (var n = 0; n < rosterSize; n++) {
                    cheapest += sals[n];
                    dearest += sals[sals.length - 1 - n];
                }

                var cap = os.maxbudget ? os.maxbudget.intVal : 0;
                var floor = os.minbudgetusage ? os.minbudgetusage.intVal : 0;

                if (cap > 0 && cheapest > cap) {
                    // "widen the player pool" is not an instruction unless it
                    // says what narrowed it. The tally is already collected for
                    // the empty-pool message above; this is the case where it is
                    // needed MORE, because the pool is not empty and nothing
                    // else on screen suggests anything is missing.
                    var why = vm.describePoolDrops(optObj, 3);
                    res.blocking.push('The cheapest possible lineup costs ' + vm.fmtMoney(cheapest) +
                        ', over the ' + vm.fmtMoney(cap) + ' cap. ' +
                        (why ? (vm.poolDropTotal(optObj) + ' players were removed from the pool: ' + why + '. ') : '') +
                        'Raise the cap, or loosen whatever is filtering the pool.');
                }
                if (floor > 0 && dearest < floor) {
                    res.blocking.push('The most expensive possible lineup costs ' + vm.fmtMoney(dearest) +
                        ', under the ' + vm.fmtMoney(floor) + ' minimum salary used. Lower that minimum.');
                }
            }

            // ---- exposure vs the number of lineups requested -------------------
            // Each player may appear in at most exposure% of the lineups, so the
            // pool has a hard ceiling on the roster slots it can fill in total.
            var expPct = os.exposuremax ? os.exposuremax.intVal : 0;
            if (expPct > 0 && expPct < 100 && lineups > 1 && rosterSize > 0) {
                var perPlayer = Math.ceil((expPct / 100) * lineups);
                var capacity = pool.length * perPlayer;
                var demand = rosterSize * lineups;
                if (capacity < demand) {
                    var maxLineups = Math.floor(capacity / rosterSize);
                    res.warnings.push('Max exposure of ' + expPct + '% lets each player appear in about ' +
                        perPlayer + ' lineup' + (perPlayer === 1 ? '' : 's') + ', so ' + pool.length +
                        ' available players can only fill about ' + maxLineups +
                        ' full lineups. Raise max exposure or widen the pool.');
                }
            }

            // ---- unique players -------------------------------------------------
            var uniq = os.minUniquePlayers ? os.minUniquePlayers.intVal : 0;
            if (uniq > 0 && rosterSize > 0 && lineups > 1) {
                var needed = rosterSize + (uniq * (lineups - 1));
                if (needed > pool.length) {
                    res.warnings.push(uniq + ' unique player' + (uniq === 1 ? '' : 's') + ' per lineup across ' +
                        lineups + ' lineups needs roughly ' + needed + ' different players, and only ' +
                        pool.length + ' are available. Lower the unique-player count or widen the pool.');
                }
            }

            // ---- max players per team --------------------------------------------
            var mppt = optObj.v4Settings ? optObj.v4Settings.max_players_per_team : 0;
            if (mppt > 0 && rosterSize > 0) {
                var teams = {};
                for (var t = 0; t < pool.length; t++) { teams[pool[t].team] = 1; }
                var teamCount = 0;
                for (var tk in teams) {
                    if (Object.prototype.hasOwnProperty.call(teams, tk)) { teamCount++; }
                }

                var teamsNeeded = Math.ceil(rosterSize / mppt);
                if (teamsNeeded > teamCount) {
                    res.blocking.push('Max ' + mppt + ' players per team means a lineup needs at least ' +
                        teamsNeeded + ' teams, but only ' + teamCount +
                        ' are available. Raise that limit or clear a team filter.');
                }
            }

            // ---- player groups ----------------------------------------------------
            var groups = vm.getActivePlayerGroupsPayload();
            var inPool = {};
            for (var q = 0; q < pool.length; q++) { inPool[pool[q].id] = 1; }

            for (var g = 0; g < groups.length; g++) {
                var grp = groups[g];
                var avail = 0;
                for (var m = 0; m < grp.playerIds.length; m++) {
                    if (inPool[grp.playerIds[m]]) { avail++; }
                }

                if (avail === 0) {
                    res.blocking.push('None of the players in the group "' + grp.name +
                        '" are in the available pool, so that rule can never be met.');
                } else if (grp.count > avail &&
                           (grp.comparator === 'atLeast' || grp.comparator === 'exactly' || grp.comparator === 'between')) {
                    res.blocking.push('The group "' + grp.name + '" asks for ' + grp.count +
                        ' players but only ' + avail + ' of its ' + grp.playerIds.length +
                        ' are available - the rest were filtered out.');
                }
            }

            // §4.1 - the one conflict we can prove locally. Blocking: it is
            // provably zero-lineup, so spending a round trip on it only
            // delays the same answer. The dialog offers Optimize anyway in
            // case this check is wrong somewhere I have not thought of.
            var pConf = vm.findPositionStackConflicts();
            for (var pci = 0; pci < pConf.length; pci++) { res.blocking.push(pConf[pci]); }

            return res;
        };

        vm.fmtMoney = function (n) {
            try { return '$' + Number(n).toLocaleString(); } catch (e) { return '$' + n; }
        };

        // Bulleted body for the error dialog / toast. Capped so the message
        // stays readable rather than becoming a wall.
        vm.formatOptiIssues = function (list, limit) {
            var max = limit || 4;
            var out = [];
            for (var i = 0; i < list.length && i < max; i++) { out.push('• ' + list[i]); }
            if (list.length > max) { out.push('• (+' + (list.length - max) + ' more)'); }
            return out.join('\n');
        };

        // ---- naming the rule an issue belongs to (errors doc §2) -------------
        // ruleIndex / stackIndex are 0-based into the arrays we SENT, which are
        // the filtered active lists - not the editor's full list. So they are
        // resolved against optObj.v4Settings, never against vm.positionStacks.
        vm.positionStackShort = function (r) {
            if (r == null || !r.anchorPosition) { return ''; }
            return ((r.anchorScope === 'all') ? 'every ' : 'one ') + r.anchorPosition;
		};

        vm.optiIssueTarget = function (iss, optObj) {
            if (iss == null) { return ''; }

            if (iss.ruleIndex != null && iss.ruleIndex >= 0) {
                var sent = (optObj && optObj.v4Settings) ? optObj.v4Settings.positionStacks : null;
                var r = (sent instanceof Array && iss.ruleIndex < sent.length) ? sent[iss.ruleIndex] : null;
                var shortStr = vm.positionStackShort(r);
                return 'Position rule ' + (iss.ruleIndex + 1) + (shortStr ? ' (for ' + shortStr + ')' : '');
			}

            if (iss.stackIndex != null && iss.stackIndex >= 0) {
                return 'Team stack ' + (iss.stackIndex + 1);
			}
            return '';
		};

        // "Position rule 2 (for one 1B): <server message>". The message is shown
        // verbatim per the errors doc - the prefix only says which rule it is
        // about, which the server knows and the text usually does not.
        vm.describeOptiIssue = function (iss, optObj) {
            if (iss == null || !iss.message) { return ''; }
            var where = vm.optiIssueTarget(iss, optObj);
            return where ? (where + ': ' + iss.message) : iss.message;
		};

        vm.collectOptiIssues = function (res, optObj) {
            var out = [];
            var list = (res && res.issues instanceof Array) ? res.issues : [];
            for (var i = 0; i < list.length; i++) {
                var txt = vm.describeOptiIssue(list[i], optObj);
                if (txt) { out.push(txt); }
			}
            return out;
		};

        // ---- §4.1 positionStackTeamStackConflict ----------------------------
        // The one conflict a client can PROVE before sending. A sameTeam
        // position rule anchored on a position that an active "limit team stack"
        // excludes can never be satisfied: the anchor is forced off the stacked
        // team, so no lineup exists. The server returns the same code, but only
        // after spending a run on it.
        vm.stackLimitsToStackedTeam = function (stk) {
            var ops = (stk != null && stk.options instanceof Array) ? stk.options : [];
            for (var i = 0; i < ops.length; i++) {
                if (ops[i].Id === 'stacking_general_stackedteamonly') { return ops[i].Value1 == 1; }
			}
            return false;
		};

        vm.stackSelectedPositions = function (stk) {
            var out = [];
            var pp = (stk != null && stk.possiblePositions instanceof Array) ? stk.possiblePositions : [];
            for (var i = 0; i < pp.length; i++) {
                if (!pp[i].included) { continue; }
                var toks = String(pp[i].PositionName || '').toUpperCase().split(/[,\/]/);
                for (var j = 0; j < toks.length; j++) {
                    var t = toks[j].trim();
                    if (t.length && out.indexOf(t) < 0) { out.push(t); }
				}
			}
            return out;
		};

        vm.findPositionStackConflicts = function () {
            var out = [];
            var rules = vm.getActivePositionStacksPayload();
            if (!rules.length) { return out; }

            var stacks = vm.stackOptions || [];
            for (var si = 0; si < stacks.length; si++) {
                var stk = stacks[si];
                if (!stk.enabled || !vm.stackLimitsToStackedTeam(stk)) { continue; }

                var stkPos = vm.stackSelectedPositions(stk);
                // no positions selected means no restriction, so nothing to clash with
                if (!stkPos.length) { continue; }

                for (var ri = 0; ri < rules.length; ri++) {
                    var r = rules[ri];
                    if (r.from !== 'sameTeam') { continue; }

                    // a combined anchor like C/1B is satisfied by EITHER half, so
                    // it only conflicts when the stack allows neither
                    var anchor = String(r.anchorPosition || '').toUpperCase().split(/[,\/]/);
                    var overlap = false;
                    for (var ai = 0; ai < anchor.length; ai++) {
                        if (stkPos.indexOf(anchor[ai].trim()) >= 0) { overlap = true; break; }
					}
                    if (overlap) { continue; }

                    out.push('Position rule ' + (ri + 1) + ' (for ' + vm.positionStackShort(r) +
                             ') needs a ' + r.anchorPosition + ' from the stacked team, but Team stack ' +
                             (si + 1) + ' only allows ' + stkPos.join('/') + ' from it. Either turn off ' +
                             '"only use players from the stacked team" on that stack, or add ' +
                             r.anchorPosition + ' to its positions.');
				}
			}
            return out;
		};

        // ══ How big is the pool, before you run anything ══════════════════════
        // The Player pool section names four settings that narrow the field and
        // never said what they narrowed it TO. You found out by optimizing and
        // reading the failure.
        //
        // The count comes from getPlayersListForOptimize - the same function the
        // run uses - rather than a second copy of its fifteen conditions, which
        // would drift the first time one of them changed. Two consequences to
        // handle:
        //
        //   1. It walks every salary on the slate, so it CANNOT run per digest.
        //      Memoized behind a signature of everything it reads.
        //   2. The real path works out the FanSense top-10 by sorting
        //      salaryListForSelSlateALL in place. That array is the projections
        //      table's own order - reordering it from a settings binding would
        //      shuffle the table behind the dialog. The preview ranks on copies.
        vm._poolSig = null;
        vm._poolCount = 0;

        // Cheap enough for a digest: one pass over AdvancedOptions doing string
        // concatenation, which is what optiChangedCount already costs.
        vm.optiPoolSig = function () {
            var s = (vm.selectedSlate != null ? vm.selectedSlate.Id : 0) + '|' +
                    (vm.salaryListForSelSlateALL || []).length + '|' +
                    (vm.excludedTeamCnt || 0) + '|' +
                    ((vm.lineupBuilder != null) ? (vm.lineupBuilder.SlotsFilled || 0) : 0) + '|' +
                    (vm.count_liked || 0) + '|' + vm.optiProjSource;

            var opts = (vm.periodData != null) ? vm.periodData.AdvancedOptions : null;
            for (var i = 0; i < (opts || []).length; i++) {
                var o = opts[i];
                s += '|' + o.Val1 + ',' + o.Val2;
                // the per-position variance/exposure lists live here, not in Val1
                for (var j = 0; j < (o.PosList || []).length; j++) {
                    s += ':' + o.PosList[j].Pos + o.PosList[j].Val;
				}
			}
            return s;
		};

        // FanSense flags without touching the live array's order.
        vm.markFanSenseOnCopy = function (ss) {
            var byLove = ss.slice().sort(function (b, a) { return a.LoveCount - b.LoveCount; });
            for (var i = 0; i < byLove.length; i++) {
                byLove[i].FanSenseLiked = (byLove[i].LoveCount > 0 && i < 10);
			}
            var byHate = ss.slice().sort(function (b, a) { return a.HateCount - b.HateCount; });
            for (var k = 0; k < byHate.length; k++) {
                byHate[k].FanSenseExcluded = (byHate[k].HateCount > 0 && k < 10);
			}
		};

        // Just enough optObj for the pool filter - no reqs, stacks, groups or
        // games, none of which it reads.
        vm.buildPoolPreviewObj = function () {
            var o = {
                slate: vm.selectedSlate,
                ss: vm.salaryListForSelSlateALL || [],
                lockedDict: {},
                ignoreTeams: {},
                varByPosDict: {}, posVarCnt: 0,
                expByPosDict: {}, expPosCnt: 0,
                likedProjBoost: 0,
                maxProj: 0
			};

            o.settings = vm.getOptiSettingsObj();
            o.likedProjBoost = o.settings.likedprojectionboost.intVal;
            if (o.likedProjBoost > 0) { o.likedProjBoost = (o.likedProjBoost / 100); }

            // a filled builder slot is a locked player, and locked bypasses every
            // pool filter - so it has to be here or the count reads low
            var lb = vm.lineupBuilder;
            if (lb != null && lb.slots instanceof Array) {
                for (var i = 0; i < lb.slots.length; i++) {
                    if (lb.slots[i].salary != null) { o.lockedDict[lb.slots[i].salary.Id] = 1; }
				}
			}

            if (vm.periodData.HasTeams) {
                for (var t = 0; t < vm.teamsInSlateForStack.length; t++) {
                    var tm = vm.teamsInSlateForStack[t];
                    if (!tm.Included && tm.Id >= 0) { o.ignoreTeams[tm.Id] = {}; }
				}
			}

            var vpo = (o.settings.positionvariancelevelmax != null) ? o.settings.positionvariancelevelmax.list : null;
            for (var v = 0; v < (vpo || []).length; v++) {
                o.varByPosDict[vpo[v].Pos] = parseInt(vpo[v].Val);
                o.posVarCnt++;
			}

            var epo = (o.settings.positionexposurelevelmax != null) ? o.settings.positionexposurelevelmax.list : null;
            for (var e = 0; e < (epo || []).length; e++) {
                o.expByPosDict[epo[e].Pos] = parseInt(epo[e].Val);
                o.expPosCnt++;
			}

            vm.markFanSenseOnCopy(o.ss);
            return o;
		};

        vm.optiPoolTotal = function () { return (vm.salaryListForSelSlateALL || []).length; };

        // The preview object is KEPT, not discarded: getPlayersListForOptimize
        // tallies why each player was dropped into optObj.poolDrops, and that
        // tally is the whole answer to "why is my pool 32 of 800?". Throwing it
        // away meant the only way to see it was to trigger a preflight failure.
        vm._poolObj = null;

        vm.optiPoolCount = function () {
            var sig = vm.optiPoolSig();
            if (sig === vm._poolSig) { return vm._poolCount; }

            vm._poolSig = sig;
            vm._poolCount = 0;
            vm._poolObj = null;
            if (!vm.optiPoolTotal() || vm.periodData == null) { return 0; }

            try {
                var o = vm.buildPoolPreviewObj();
                vm._poolCount = vm.getPlayersListForOptimize(o).length;
                vm._poolObj = o;
			} catch (err) { vm._poolCount = 0; }
            return vm._poolCount;
		};

        // "768 removed: 700 by the ownership range, 50 by no projection". Named
        // in the panel rather than only in a failure, because a pool quietly
        // narrowed to a tenth of the slate is worth seeing BEFORE pressing
        // Optimize - the run may well succeed and just be wrong.
        vm.optiPoolDropStr = function () {
            var kept = vm.optiPoolCount();            // also refreshes the tally
            if (vm._poolObj == null) { return ''; }

            var n = vm.poolDropTotal(vm._poolObj);
            if (!n) { return ''; }

            // Leads with what SURVIVED. The head above carries "32 of 800" too,
            // but this line is the one being read when the number looks wrong,
            // and a sentence that opens with a removal count reads as though
            // that is the pool.
            return kept + ' player' + (kept === 1 ? '' : 's') + ' included, ' +
                   n + ' removed: ' + vm.describePoolDrops(vm._poolObj, 3);
		};

        vm.getPlayersListForOptimize = function (optObj) {
            var players = [];
            var os = optObj.settings;
            // Tally WHY players were dropped. A run that fails or falls short
            // almost always traces to a setting that emptied the pool, and
            // "no players were available" doesn't say which one - this does.
            var drops = optObj.poolDrops = {};
            function drop(reason) { drops[reason] = (drops[reason] || 0) + 1; }

            for (var i = 0; i < optObj.ss.length; i++) {
                var sal = optObj.ss[i];
                var p = vm.getOptiProjection(sal, optObj);
                if (!((optObj.lockedDict[sal.Id] == 1) || sal.IsLiked)) {
                    if (p <= 0) {
                        drop('noProjection'); continue;
                    }
                    if (!sal.IsIncluded || (os.usefansenseexcluded.boolVal && sal.FanSenseExcluded)) {
                        drop('excluded'); continue;
                    }
                    if (optObj.ignoreTeams[sal.PTID] != null) {
                        drop('teamFilter'); continue;
                    }
                    if (os.likedplayerpool.boolVal) {
                        drop('likedOnly'); continue;
                    }
                    if (vm.Sport == 3 && (sal.LU != 100 && sal.LU > os.mlb_lineupposition.intVal)) {
                        drop('battingOrder'); continue;
                    }
                    if (vm.Sport == 6) {
                        var ppl = sal.PPL;
                        if (os.nhl_minpowerplayline.intVal == 1 && ppl != 1 || (os.nhl_minpowerplayline.intVal == 2 && ppl == 0)) {
                            drop('powerPlayLine'); continue;
                        }
                        if (sal.LU > os.nhl_maxlinedefense.intVal && sal.POS.indexOf('D') >= 0) {
                            drop('defenseLine'); continue;
                        }
                        if (sal.LU > os.nhl_maxlineoffense.intVal && (sal.POS.indexOf('W') >= 0 || sal.POS.indexOf('C') >= 0)) {
                            drop('offenseLine'); continue;
                        }
                    }
                    if (vm.Sport == 2 || vm.Sport == 4 || vm.Sport == 12) {
                        if (os.startersonly.boolVal && sal.StartingStatus == 0) {
                            drop('startersOnly'); continue;
                        }
                    }
                    if (os.noinjuredplayers.boolVal && sal.IS != 0) {
                        drop('injured'); continue;
                    }
                    if (p < (os.minprojection != null && os.minprojection.intVal)) {
                        drop('minProjection'); continue;
                    }
                    if (sal.SAL > 0 && (sal.Owned < os.playerownershiprange.min || sal.Owned > os.playerownershiprange.max)) {
                        drop('ownershipRange'); continue;
                    }
                    if (sal.SAL > 0 && sal.SAL < os.minsalary.intVal) {
                        drop('minSalary'); continue;
                    }
                }

                var va = os.playervariancelevel.intVal;
                if (optObj.posVarCnt > 0) {
                    var pa = sal.POS.split(/[,\/]/);
                    for (var j = 0; j < pa.length; j++) {
                        var vp = optObj.varByPosDict[pa[j]];
                        if (vp != null && vp != undefined) {
                            va = vp;
                            break;
                        }
                    }
                }

                var exp = os.exposuremax.intVal;
                if (optObj.expPosCnt > 0) {
                    var pa = sal.POS.split(/[,\/]/);
                    for (var j = 0; j < pa.length; j++) {
                        var e = optObj.expByPosDict[pa[j]];
                        if (e != null && e != undefined) {
                            exp = e;
                            break;
                        }
                    }
                }

                if (vm.hasUserModifiedMaxExp(sal)) {
                    exp = sal.userMod.MaxExp;
                }

                if (optObj.lockedDict[sal.Id] == 1) {
                    exp = 100;
                }

                // A max exposure of 0 removes the player as surely as any filter
                // above, and this was the ONE drop that went untallied - so a
                // pool gutted by an exposure setting reported no reason at all,
                // which is precisely the "I can't see why" case. Split three
                // ways because the three have completely different fixes.
                if (exp <= 0) {
                    if (vm.hasUserModifiedMaxExp(sal)) { drop('playerMaxExpZero'); }
                    else if (optObj.expPosCnt > 0) { drop('positionMaxExpZero'); }
                    else { drop('maxExpZero'); }
                    continue;
				}

                if (sal.IsLiked || (os.usefansense.boolVal && sal.FanSenseLiked)) {
                    if (os.lovedexposure.boolVal) {
                        exp = 100;
                    }

                    if (optObj.likedProjBoost > 0) {
                        p += (optObj.likedProjBoost * p);
                    }
                }

                var randomPct = (os.playerrandomness != null) ? os.playerrandomness.intVal : 0;
                if (randomPct > 0) {
                    var pct = Math.floor(Math.random() * randomPct) * ((sal.IsLiked || Math.random() < 0.5) ? 1 : -1);
                    p *= ((100 + pct) / 100);
                }

                if (va > 0 && p > 1) {
                    var stats = vm.getSlatePosStats(optObj.slate, sal);
                    var projDiff = (stats != null) ? (stats.maxProj - stats.minProj) : 10;
                    var buckSize = (projDiff > 0) ? LineStarUtility.round((projDiff / (11 - va)), 1) : 1;
                    if (buckSize <= 0) {
                        buckSize = 0.1;
                    }
                    p = LineStarUtility.round(Math.round(p / buckSize) * buckSize, 2);
                    if (p < 1) {
                        p = 1;
                    }
                }

                if (!(typeof p === 'number') || isNaN(p)) {
                    console.log('Invalid projection!');
                    p = 0;
                }

                var lp = (vm.Sport == 3 || vm.Sport == 6) ? sal.LU : 0;
                var ppl = (vm.Sport == 6) ? sal.PPL : 0;
                var proj = (Math.round((p + Number.EPSILON) * 100) / 100);

                optObj.maxProj = Math.max(optObj.maxProj, proj);

                players.push({ id: sal.Id, name: sal.Name, team: sal.PTID, salary: sal.SAL, projection: proj, positions: sal.LineupPos, maxExposure: exp, oppTeam: sal.OTID, lineupPosition: lp, hockeyPP: ppl });
            }

            return players;
        };

        vm.runChunkedOptimize = async function (optObj) {
            var promises = [];
            var lineups = [];
            var comp = 0;

            optObj.v4Settings.num_lineups = 1;

            for (var oa = 0; oa < optObj.lineupsToOpt; oa++) {
                var players = vm.getPlayersListForOptimize(optObj);
                var promise = webService.optimizeLineupsBuffered(function (success, data)
                {
                    if (data != null && data.lineups != null && data.lineups.length > 0) {
                        lineups.push(data.lineups[0]);
                    }

                    if (++comp == optObj.lineupsToOpt) {
                        vm.convertLineupsToSet(lineups, optObj);
                        vm.optimizingLineups = 0;
                    }
                }, players, optObj.v4Settings)
            }
        };

        vm.getOptiSettingsObj = function () {
            var settings = {};

            var opts = (vm.periodData != null) ? vm.periodData.AdvancedOptions : null;
            if (opts != null) {
                for (var i = 0; i < opts.length; i++) {
                    var o = opts[i];
                    var obj = { intVal: LineStarUtility.ensureNumeric(o.Val1) };

                    if (o.OptionType == 4) {
                        obj.min = LineStarUtility.ensureNumeric(o.Val1);
                        obj.max = LineStarUtility.ensureNumeric(o.Val2);
                    } else if (o.OptionType == 1) {
                        obj.boolVal = (o.Val1 == "1");
                    } else if (o.OptionType == 5) {
                        obj.list = o.PosList;
                    }

                    settings[o.Id] = obj;
                }
            }

            return settings;
        };

        vm.onLineupOptimize = function(swaptimizeSetId, callback){
            if (!vm.canStartOptimize()){ return; }

            var options = vm.getOptimizeOptions();
            var lb = vm.lineupBuilder;
            var players = Array(lb.slots.length).fill(0);
            for(var i=0; i<lb.slots.length;i++){
                var slot = lb.slots[i];
                if(slot != null && slot.salary != null){
                    players[i] = slot.salary.Id;
                }
			}
            var ignoreTeams = [];
            for(var i=0; i < vm.teamsInSlateForStack.length;i++){
                var t = vm.teamsInSlateForStack[i];
                if(!t.Included && t.Id >= 0){
                    ignoreTeams.push(t.Id);
				}
            }
            var reqs = [];
            for (var k in vm.reqCacheDict) {
                var r = vm.reqCacheDict[k];
                if (r.activeFilters > 0) {
                    reqs.push({ 'Name': k, 'Positions': r.PosListStr });
                }
            }
            var stacks = [];
            for (var i = 0; i< vm.stackOptions.length; i++) {
                var stk = vm.stackOptions[i];
                if (!stk.enabled) { continue;}
                var opt = { 'Options': [], 'Teams': [], 'StackSize': stk.stackSize, 'Positions': [] };

                for (const [key, value] of Object.entries(stk.teams)) {
                    var exp = LineStarUtility.ensureNumeric(value);
                    if (!(exp > 0 && exp <= 100)) {
                        //console.log('A Team stack exposure value was not a number.');
                        exp = 0;
                    }
                    opt.Teams.push({ Id: parseInt(key), MaxExp: exp });
                }
                for (var j = 0; j < stk.options.length; j++) {
                    var op = stk.options[j];
                    var val = (op.OptionType == 1) ? op.Val1 : op.Value1;
                    opt.Options.push({ OptionType: op.OptionType, Option: op.Option, Value1: val, Value2: op.Value2});
                }
                for (var j = 0; j < stk.possiblePositions.length; j++) {
                    var pos = stk.possiblePositions[j];
                    if (pos.included) {
                        opt.Positions.push(pos.PositionName);
                    }
                }

                if (opt.Positions.length == 0) {
                    vm.showtoast('ERROR: A stack had no positions selected');
                } else {
                    stacks.push(opt);
                }
            }

            var swapData = { LocalSetId: swaptimizeSetId, SwapAllowDupes: vm.swaptimizeDupes, SwapOnlyUnlocked: vm.swapOnlyUnlockedFlag(), SwapDeleteSet: !vm.swaptimizeNewSet };
            vm.optiStopped = false;
            
            vm.optimizingLineups = 1;
            vm.showLineupBuilder=0;
            setTimeout(function(){
                webService.optimizeLineups(function (set) {
                    vm.lastOptimizeTime = new Date();
                    $scope.$apply(() => {
                        vm.optimizingLineups = 0;
                        if (set != null) {
                            set.needsSave = 0;
                            set.remote = 1;
                            vm.assignLineupIds(set);
                            vm.periodData.Sets.push(set);
                            vm.processLineupSetStatsSet(set);
                            vm.lineupsDialogSet = set;
                            vm.openLineupsDialog();   // lineups are ready - now show them
                        }
                        if (callback != null) {
                            callback(set);
                        }
                    });

                    //$scope.$digest();
                }, ignoreTeams, players, vm.generateModelVal, options, reqs, stacks, swapData);

            }, 1000);
		};


        vm.lineupDisplayCnt = '';
        vm.selectedSlateLineupCnt = 0;
        vm.selectedSlateSets = [];
        vm.otherSlateLineupsSet = {};
        vm.updateLineupSetCounts = function(){

            var totalCnt = 0, slateCnt = 0;
            var dets = {};
            var sets = [];
            var ss = vm.periodData.Sets;
            var slate = vm.selectedSlate;
            if (ss != null) {
                for (var i = 0; i < ss.length; i++) {
                    var set = ss[i];
                    totalCnt += set.Lineups.length;
                    if (set.SetInfo.SlateId == slate.Id) {
                        sets.push(set);
                        slateCnt += set.Lineups.length;
                    } else {
                        var fs = vm.getSlate(set.SetInfo.SlateId);
                        var stats = null;
                        if ((stats = dets[set.SetInfo.SlateId]) == null) {
                            stats = dets[set.SetInfo.SlateId] = { lineupCnt: 0, slate: fs, setCnt: 0 };
                        }
                        stats.lineupCnt += set.Lineups.length;
                        stats.setCnt++;
                    }
                }
            }
            vm.otherSlateLineupsSet = dets;
            vm.selectedSlateLineupCnt = slateCnt;
            vm.totalLineupCnt = totalCnt;
            vm.lineupDisplayCnt = slateCnt + ' / ' + totalCnt;
            vm.selectedSlateSets = sets;
            // keep the lineups-dialog selection valid as sets are created,
            // merged or deleted
            if (vm.ensureSelectedLineupSet) { vm.ensureSelectedLineupSet(); }
		};

        vm.onDeleteSet = function(set){
            webService.deleteLineupSet(function (result) {
                if (vm.showProjections == 0) {
                    $('.lineupSet[data-setid="' + set.SetInfo.LocalId + '"]').hide("slow", function () {
                        $scope.$apply(() => {
                            vm.finalizeSetDelete(set);
                        });
                    });
                } else {
                    vm.finalizeSetDelete(set);
                }
            }, set);
        };

        vm.finalizeSetDelete = function (set) {
            var idx = vm.periodData.Sets.indexOf(set);
            if (idx >= 0) {
                vm.periodData.Sets.splice(idx, 1);
                vm.updateLineupSetCounts();
            }
        };

        vm.uploadDFSCSVMessage = null;
        vm.uploadfileDFSCSV = null;
        vm.uploadFileCsvStarted = false;
        vm.uploadFileCsvCompleted = false;
        vm.onUploadExternalLineups = function () {
            if (LineStar.IsPremium != 1) {
                vm.showtoast('You must be a LineStar premium member to do this.');
                return;
            }
            vm.uploadFileCsvStarted = false;
            vm.uploadFileCsvCompleted = false;
            vm.uploadDataMode = 1;
            vm.uploadDFSCSVMessage = "";
            vm.uploadCsvFileState = '';
            vm.uploadCsvWarning = '';
            vm.dfsCsvFileName = '';
            vm.dfsImportPending = null;
            vm.dfsImportSetCount = 1;
            vm.dfsImportedSets = [];
            vm.showUploadProjections = 1;
        };

        // One read path for the picker and the drop zone, same as the
        // projections importer.
        vm.dfsCsvFileName = '';

        vm.readDFSCSVFile = function (file) {
            if (file == null) { return; }
            vm.dfsCsvFileName = file.name || '';
            vm.uploadFileCsvStarted = true;

            var reader = new FileReader();
            reader.onload = function () { vm.processfileDFSCSV(reader.result); };
            reader.onerror = function () {
                vm.updateDFSCsvMsg('That file could not be read. Download it again from ' + vm.siteName + ' and try once more.', true, false);
			};
            reader.readAsText(file);
		};

        vm.onUploadfileDFSCSV = function (event, files) {
            var input = (event != null) ? event.target : null;
            var list = files || (input ? input.files : null);
            if (list == null || !list.length) { return; }

            vm.readDFSCSVFile(list[0]);
            // a file input fires no change event for the same file twice
            if (input) { try { input.value = ''; } catch (e) { } }
		};

        vm.onDropDFSCSV = function (file) {
            var name = String((file && file.name) || '').toLowerCase();
            if (name.length && !/\.(csv|txt)$/.test(name)) {
                vm.showtoast('Drop the .csv entries file you downloaded from ' + vm.siteName + '.');
                return;
			}
            vm.readDFSCSVFile(file);
		};
        vm.findSlateFromDfsId = function (id) {
            var s = vm.salaryContainer.Slates;
            for (var i = 0; i < s.length; i++) {
                var sl = s[i];
                if (sl.DfsSlateId == id) {
                    return sl;
                }
            }
            return null;
        };
        // uploadCsvFileState replaces the old hardcoded red/green hex: those two
        // colours were unreadable against the dark theme, and a state name lets
        // the stylesheet pick a token per theme.
        vm.uploadCsvFileState = '';

        vm.updateDFSCsvMsg = function (txt, resultFailed, resultSuccess) {
            $scope.$apply(() => {
                vm.uploadDFSCSVMessage = txt;

                if (resultFailed) {
                    vm.uploadFileCsvStarted = false;
                    vm.uploadFileCsvCompleted = false;
                    vm.uploadCsvFileState = 'error';
                }

                if (resultSuccess) {
                    vm.uploadFileCsvStarted = false;
                    vm.uploadFileCsvCompleted = true;
                    vm.uploadCsvFileState = 'ok';
                }
            });
        };

        vm.isStringInteger = function (str) {
            if (typeof str !== 'string') {
                return false;
            }
            const trimmedStr = str.trim();
            if (trimmedStr === '') {
                return false;
            }
            const num = parseInt(trimmedStr, 10);
            return Number.isInteger(num) && String(num) === trimmedStr;
        };

        vm.processfileDFSCSV = function (text) {
            if (text == null || text.length < 2) {
                vm.updateDFSCsvMsg("ERROR: File does not appear to be valid.", 1, 0);
                return;
            }
            var lines = text.split(/\r?\n/);
            if (lines == null || lines.length < 2) {
                vm.updateDFSCsvMsg("ERROR: File does not appear to be valid.", 1, 0);
                return;
            }

            var slate = vm.selectedSlate;
            var eCnt = slate.LineupRequirements.length;
            var set = { Lineups: [], SetInfo: { SlateId: slate.Id, Site: vm.Site, PeriodId: LineStar.PeriodId, LocalId: vm.getRandomLineupId(), GeneratedAt: (new Date()).getTime(), CreatedUtc: new Date().toISOString(), SetName: "#Import# from " + vm.siteName, needsSave: 1, remote: 0, Sport: LineStar.Sport, Model: 0 } };
            var errors = 0;
            var missing = 0;

            // isImportSet is set in commitDfsImport now - only ONE set of an
            // import wears it, and a split makes several

            //Save the ID-MAP
            var colsIdx = [];
            var playerItemsMap = [];
            var hasTeams = (vm.periodData.HasTeams && vm.Sport != 8);
            var startMapIdx = 0;

            if (vm.Site == 1 || vm.Site == 2) {
                var foundCnt = 0;
                var colMap = (vm.Site == 1) ? ["Position", "ID", "Name", "Salary"] : ["Position", "Id", "Nickname", "Salary"];
                colsIdx = [];

                for (var i = 0; i < lines.length; i++) {
                    var ss = vm.parseCsvRow(lines[i]);

                    for (var j = 0; j < ss.length; j++) {
                        if (ss[j] == colMap[0]) {
                            foundCnt++;
                        } else if (ss[j] == colMap[1]) {
                            colsIdx[1] = j;
                            foundCnt++;
                        } else if (ss[j] == colMap[2]) {
                            colsIdx[0] = j;
                            foundCnt++;
                        } else if (ss[j] == colMap[3]) {
                            colsIdx[2] = j;
                            foundCnt++;
                        }
                    }
                    if (foundCnt >= 3) {
                        startMapIdx = i+1;
                        break;
                    }
                }

                if (foundCnt < 3) {
                    vm.updateDFSCsvMsg("ERROR: Unable to map matching columns.", 1, 0);
                    return;
                }
            } else if (vm.Site == 4) {
                colsIdx = [20, 20, 26];
            } else {
                vm.updateDFSCsvMsg("ERROR: Unsupported site.", 1, 0);
                return;
            }

            for (var i = startMapIdx; i < lines.length; i++) {
                var ss = vm.parseCsvRow(lines[i]);
                var sal = parseInt(ss[colsIdx[2]]);
                if (isNaN(sal)) {
                    continue;
                }
                var name = String(ss[colsIdx[0]] || '').trim();
                var id = String(ss[colsIdx[1]] || '').trim();

                // Same id shapes as the roster cells, so the same parsers - the
                // FanDuel one in particular used split('-')[1], which assumed
                // exactly two segments and picked the wrong one otherwise.
                if (vm.Site == 1) {
                    if (isNaN(parseInt(id))) {
                        continue;
                    }
                } else if (vm.Site == 2) {
                    id = vm.parseFdPlayerCell(id).id;
                } else if (vm.Site == 4) {
                    var y = vm.parseYahooPlayerCell(id);
                    id = y.id;
                    if (y.name.length) { name = y.name; }
                }

                if (!id.length) { continue; }
                playerItemsMap.push({ "Name": name, "ID": id, "Salary": sal });
            }

            if (playerItemsMap.length == 0) {
                vm.updateDFSCsvMsg("ERROR: Player Salary List was not found. File appears invalid.", 1, 0);
                return;
            }

            var itemKey = "" + vm.Site + "_" + vm.Sport + "_" + slate.Id;
            vm.pushLimitedStorageItem("dfsmap", playerItemsMap, itemKey, 12);

            //["LineupID", "ContestName", "ContestID", "PlayerStart"]
            if (vm.Site == 1) {
                colsIdx = [0, 1, 2, 4];
            } else if (vm.Site == 2) {
                colsIdx = [0, 2, 1, 4];
            } else if (vm.Site == 4) {
                colsIdx = [4, 0, 3, 5];
            }

            for (var i = 1; i < lines.length; i++) {
                // parseCsvRow, not split(','): contest names routinely carry a
                // comma ("Sun 1PM, 20 Entry Max") and the site quotes them, so
                // splitting on every comma shifted every roster column after it
                // and the whole row parsed as garbage.
                var lls = vm.parseCsvRow(lines[i]);
                var entryId = String(lls[colsIdx[0]] || '').replace(/['"]/g, '');
                entryId = parseInt(entryId);
                if (isNaN(entryId)) {
                    break;
                }

                var contestName = String(lls[colsIdx[1]] || '').replace(/['"]/g, '').trim();
                var contestId = String(lls[colsIdx[2]] || '').replace(/['"]/g, '');

                var lineup = { LineupItems: [], Name: entryId.toString() + ":" + contestId.toString(), SlateId: slate.Id };

                // Name is the server-persisted "entryId:contestId" link and must
                // not change. These ride alongside it for grouping at import
                // time - jsonifySet whitelists Name and SalaryList, so nothing
                // here reaches the server or survives a reload.
                lineup.ContestName = contestName;
                lineup.ContestId = contestId;
                lineup.EntryId = entryId;
                lineup.LockedFromSite = 0;
                // per lineup as well as in total: contests can be deselected
                // before importing, and the warning has to count only what
                // actually goes in
                lineup.MissingCount = 0;

                var playerStartIdx = colsIdx[3];

                for (var j = 0; j < eCnt; j++) {
                    var cell = vm.parseDfsPlayerCell(String(lls[j + playerStartIdx] || '').replace(/['"]/g, ''));
                    if (cell.locked) { lineup.LockedFromSite++; }

                    var p = null;
                    if (cell.id && cell.id.length) {
                        p = vm.findPlayerFromDKData(playerItemsMap, cell.id, cell.name);
                        if (p == null) {
                            errors++;
                        }
                    } else {
                        missing++;
                        lineup.MissingCount++;
                    }

                    var item = { Id: 0, ItemOrder: j, PlayerId: (p != null) ? p.PID : 0, Position: (p != null) ? p.POS : "", Projection: (p != null) ? p.PP : 0, Salary: p, SalaryId: (p != null) ? p.Id : 0, req: slate.LineupRequirements[j] };
                    lineup.LineupItems.push(item);
                }

                if (lineup.LineupItems.length == eCnt) {
                    set.Lineups.push(lineup);
                } else {
                    errors++;
                }
            }

            vm.finishDfsImport(set, errors, missing);
        };

        // ══ One set, or one per contest ═══════════════════════════════════════
        // An entries file usually spans several contests, and splitting them is
        // often what people want - different contests get different swap
        // treatment. Not always, though, so it is asked rather than assumed, and
        // only asked when there is actually more than one contest to split.

        // "#Import# Milly Maker". The #Import# marker is what onExportSet keys
        // off to offer the ID-linked export, so it has to survive whatever the
        // contest happens to be called - hence prefix first, then the name,
        // truncated. SetName is a server column, not free text.
        var IMPORT_SET_PREFIX = '#Import# ';
        var IMPORT_SET_NAME_MAX = 60;

        vm.importSetName = function (l, taken) {
            var n = String((l && l.ContestName) || '').trim();
            if (!n.length) { n = 'Contest ' + String((l && l.ContestId) || ''); }

            var max = IMPORT_SET_NAME_MAX - IMPORT_SET_PREFIX.length;
            if (n.length > max) { n = n.substring(0, max - 2).trim() + '…'; }

            // two contests can share a name - identical set names in the list
            // would be indistinguishable
            if (taken != null) {
                var base = n, k = 2;
                while (taken[n.toLowerCase()]) { n = base + ' (' + (k++) + ')'; }
                taken[n.toLowerCase()] = 1;
			}
            return IMPORT_SET_PREFIX + n;
		};

        vm.newImportSet = function (slateId, name) {
            return {
                Lineups: [],
                SetInfo: {
                    SlateId: slateId, Site: vm.Site, PeriodId: LineStar.PeriodId,
                    LocalId: vm.getRandomLineupId(), GeneratedAt: (new Date()).getTime(),
                    CreatedUtc: new Date().toISOString(), SetName: name,
                    needsSave: 1, remote: 0, Sport: LineStar.Sport, Model: 0
				}
			};
		};

        // The distinct contests in a parsed set, in the order they first appear,
        // with an entry count each.
        vm.dfsImportContests = function (set) {
            var seen = {}, out = [];
            for (var i = 0; i < set.Lineups.length; i++) {
                var l = set.Lineups[i];
                var id = String(l.ContestId || '');
                if (seen[id] != null) { seen[id].n++; continue; }
                // `on` is the import checkbox - everything in the file is taken
                // unless the user says otherwise
                seen[id] = { id: id, name: String(l.ContestName || '').trim(), n: 1, on: true };
                out.push(seen[id]);
			}
            return out;
		};

        // ---- which contests are actually being imported ----
        // Counts only, deliberately: the ng-repeat stays bound to the stable
        // contests array. A helper returning a fresh array every digest would be a
        // new collection every pass and Angular would never settle.
        vm.dfsSelectedContestCount = function () {
            var p = vm.dfsImportPending;
            if (p == null) { return 0; }
            var n = 0;
            for (var i = 0; i < p.contests.length; i++) { if (p.contests[i].on) { n++; } }
            return n;
		};

        vm.dfsSelectedEntryCount = function () {
            var p = vm.dfsImportPending;
            if (p == null) { return 0; }
            var n = 0;
            for (var i = 0; i < p.contests.length; i++) { if (p.contests[i].on) { n += p.contests[i].n; } }
            return n;
		};

        vm.toggleDfsContest = function (c) {
            if (c != null) { c.on = !c.on; }
		};

        vm.setAllDfsContests = function (on) {
            var p = vm.dfsImportPending;
            if (p == null) { return; }
            for (var i = 0; i < p.contests.length; i++) { p.contests[i].on = !!on; }
		};

        // {contestId: 1} for the selected ones
        vm.dfsSelectedContestSet = function () {
            var out = {}, p = vm.dfsImportPending;
            if (p == null) { return out; }
            for (var i = 0; i < p.contests.length; i++) {
                if (p.contests[i].on) { out[String(p.contests[i].id)] = 1; }
			}
            return out;
		};

        vm.dfsImportPending = null;
        vm.dfsImportSetCount = 1;
        vm.dfsImportedSets = [];

        // Straight from the import into the swaptimizer, skipping the hunt for
        // the set in the list. Only offered for a single set, where there is no
        // ambiguity about which one is meant.
        vm.onSwaptimizeImported = function () {
            var s = (vm.dfsImportedSets.length === 1) ? vm.dfsImportedSets[0] : null;
            vm.showUploadProjections = 0;
            if (s != null) { vm.onSwaptimizeSet(s); }
		};

        vm.finishDfsImport = function (set, errors, missing) {
            if (errors > 0) {
                vm.updateDFSCsvMsg("Some players did not match. Check that the slate selected on LineStar is the one these entries were built for.", 1, 0);
                return;
			}
            if (!set.Lineups.length) {
                vm.updateDFSCsvMsg("No lineups were found in that file.", 1, 0);
                return;
			}

            var contests = vm.dfsImportContests(set);
            if (contests.length < 2) { vm.commitDfsImport(set, false, missing); return; }

            // more than one contest: stop and ask
            $scope.$apply(() => {
                vm.uploadFileCsvStarted = false;
                vm.uploadDFSCSVMessage = '';
                vm.dfsImportPending = { set: set, contests: contests, missing: missing, total: set.Lineups.length };
			});
		};

        vm.onDfsImportChoice = function (perContest) {
            var p = vm.dfsImportPending;
            if (p == null) { return; }

            // Deselected contests are not imported at all, so the set is
            // narrowed here rather than only at the split - and `missing` is
            // re-tallied from the lineups that survive, or the warning counts
            // players from entries nobody asked for.
            var keep = vm.dfsSelectedContestSet();
            var lineups = [], missing = 0;
            for (var i = 0; i < p.set.Lineups.length; i++) {
                var l = p.set.Lineups[i];
                if (!keep[String(l.ContestId || '')]) { continue; }
                lineups.push(l);
                missing += (l.MissingCount || 0);
			}
            if (!lineups.length) { return; }

            p.set.Lineups = lineups;
            vm.dfsImportPending = null;
            vm.uploadFileCsvStarted = true;
            vm.commitDfsImport(p.set, perContest, missing);
		};

        vm.splitSetByContest = function (set) {
            var byId = {}, out = [], taken = {};

            for (var i = 0; i < set.Lineups.length; i++) {
                var l = set.Lineups[i];
                var id = String(l.ContestId || '');

                if (byId[id] == null) {
                    byId[id] = vm.newImportSet(set.SetInfo.SlateId, vm.importSetName(l, taken));
                    out.push(byId[id]);
				}
                byId[id].Lineups.push(l);
			}
            return out;
		};

        vm.commitDfsImport = function (set, perContest, missing) {
            var sets = perContest ? vm.splitSetByContest(set) : [set];

            // One set holding exactly one contest gets that contest's name
            // rather than the generic "#Import# from DraftKings". Reached by
            // deselecting down to a single contest, where the name you picked it
            // by is far more use than the site it came from.
            if (!perContest && sets.length === 1) {
                var only = vm.dfsImportContests(set);
                if (only.length === 1) { sets[0].SetInfo.SetName = vm.importSetName(set.Lineups[0], null); }
			}

            // Only ONE set carries the flag: saveSetChanges fires the "uploaded"
            // message for every set wearing it, and eight identical toasts for
            // one import is not a report, it is noise. The count rides separately
            // so the single message can still say how many were made.
            vm.dfsImportSetCount = sets.length;
            sets[0].isImportSet = true;
            // kept so the "what next" panel can name the set, and hand it
            // straight to the swaptimizer when there is only one
            vm.dfsImportedSets = sets;

            // its own field - the success message below would otherwise
            // overwrite it, which is every time a partial miss actually happens
            vm.uploadCsvWarning = (missing > 0)
                ? (missing + ' player' + (missing === 1 ? ' was' : 's were') + ' missing from your entries and left as an empty slot.')
                : '';

            var apply = function () {
                for (var i = 0; i < sets.length; i++) {
                    vm.periodData.Sets.push(sets[i]);
                    vm.processLineupSetStatsSet(sets[i]);
				}

                // Land on what was just imported. The assignment MUST come
                // before updateLineupSetCounts: that rebuilds selectedSlateSets
                // and then calls ensureSelectedLineupSet, which keeps the
                // current selection only when it appears in that derived list.
                // Set it afterwards and the selection has already fallen
                // through to "most recent" - the same ordering trap the V4
                // streaming path carries a note about.
                vm.lineupsDialogSet = sets[0];
                vm.updateLineupSetCounts();

                vm.saveSetChanges_debounce();
			};

            // reached both from inside the FileReader callback (no digest) and
            // from a click handler (already in one)
            if ($scope.$$phase) { apply(); } else { $scope.$apply(apply); }
		};

        vm.getLimitedStorageItem = function (key, itemKey) {
            var data = localStorage.getItem(key);
            var json = (data != null && data.length > 0) ? LZString.decompressFromUTF16(data) : null;
            var items = (json != null) ? JSON.parse(json) : [];
            for (var i = 0; i < items.length; i++) {
                if (items[i].Key == itemKey) {
                    return items[i].Data;
                }
            }
            return null;
        };

        vm.pushLimitedStorageItem = function (key, item, itemKey, maxCount) {
            var newItem = { Date: new Date().getTime(), Key: itemKey, Data: item };
            var data = localStorage.getItem(key);
            var json = (data != null && data.length > 0) ? LZString.decompressFromUTF16(data) : null;
            var items = (json != null) ? JSON.parse(json) : [];

            var ri = -1;
            for (var i = 0; i < items.length; i++) {
                if (items[i].Key == itemKey) {
                    ri = i;
                    break;
                }
            }
            if (ri >= 0) {
                items[ri] = newItem;
            } else {
                if (items.length > maxCount) {
                    items.sort((a, b) => a.Date - b.Date);
                    items[0] = newItem;
                } else {
                    items.push(newItem);
                }
            }
            localStorage.setItem(key, LZString.compressToUTF16(angular.toJson(items)));
        };

        // ---- reading a roster cell out of the site's entries file ----
        // Each site encodes the player differently and each has a trap.

        // DraftKings writes `Name (12345)`, and appends ` (LOCKED)` once the
        // player's game has started. Reading the FIRST parenthesised group
        // happened to work for that exact shape, but breaks on any name that
        // contains parentheses of its own; reading the LAST group grabs the
        // word LOCKED and yields no id at all. So scan every group and keep the
        // last NUMERIC one (§3.5.A).
        vm.parseDkPlayerCell = function (cell) {
            var s = String(cell == null ? '' : cell).trim();
            var out = { id: '', name: s, locked: /\(\s*LOCKED\s*\)/i.test(s) };

            var re = /\(([^)]*)\)/g, m, lastNum = null, lastIdx = -1;
            while ((m = re.exec(s)) !== null) {
                var t = m[1].trim();
                if (/^\d+$/.test(t)) { lastNum = t; lastIdx = m.index; }
			}

            if (lastNum != null) {
                out.id = lastNum;
                out.name = (lastIdx > 0) ? s.substring(0, lastIdx).trim() : '';
			}
            return out;
		};

        // FanDuel writes `slateId-playerId`, usually with no name at all. The id
        // is the segment after the LAST dash - split('-')[1] assumed exactly two
        // segments and silently produced the wrong id for anything else.
        vm.parseFdPlayerCell = function (cell) {
            var s = String(cell == null ? '' : cell).trim();
            var i = s.lastIndexOf('-');
            if (i < 0) { return { id: s, name: '', locked: false }; }

            var lead = s.substring(0, i).trim();
            return {
                id: s.substring(i + 1).trim(),
                // the leading part is the slate id, not a name
                name: /^\d+$/.test(lead) ? '' : lead,
                locked: false
			};
		};

        // Yahoo writes `playerId - Name`.
        vm.parseYahooPlayerCell = function (cell) {
            var s = String(cell == null ? '' : cell).trim();
            var i = s.indexOf(' - ');
            if (i < 0) { return { id: s, name: '', locked: false }; }
            return { id: s.substring(0, i).trim(), name: s.substring(i + 3).trim(), locked: false };
		};

        vm.parseDfsPlayerCell = function (cell) {
            if (vm.Site == 1) { return vm.parseDkPlayerCell(cell); }
            if (vm.Site == 2) { return vm.parseFdPlayerCell(cell); }
            if (vm.Site == 4) { return vm.parseYahooPlayerCell(cell); }
            return { id: String(cell == null ? '' : cell).trim(), name: '', locked: false };
		};

        // Resolves a site player id to one of our salaries, via the file's own
        // reference section (id -> name + salary) and then a name match.
        //
        // `fallbackName` is the name off the roster cell itself, used when the
        // id is not in the reference section at all - which is the normal case
        // on FanDuel, whose roster ids often do not live in the same space as
        // the reference ids (§3.5.A).
        vm.findPlayerFromDKData = function (data, id, fallbackName) {
            var item = null;
            for (var i = 0; i < (data || []).length; i++) {
                if (String(data[i].ID) === String(id)) { item = data[i]; break; }
			}

            var name = (item != null) ? item.Name : fallbackName;
            // The old comparison was removeDiacritics() alone and case
            // SENSITIVE, so the site's "D'Andre Swift" never matched our
            // "DAndre Swift". This is the projections importer's normalizer:
            // case, diacritics, punctuation and Jr/Sr all folded away.
            var key = vm.keyProjName(name);
            if (!key) { return null; }

            var foundItem = null;
            for (var i = 0; i < vm.salaryListForSelSlateALL.length; i++) {
                var sal = vm.salaryListForSelSlateALL[i];
                if (vm.keyProjName(sal.Name) !== key) { continue; }

                foundItem = sal;
                // salary breaks the tie between two players of the same name
                if (item != null && sal.SAL == item.Salary) { break; }
			}
            return foundItem;
		};

        vm.exportDialogComplete = false;
        vm.exportDialogError = '';
        vm.exportDialogWarning = '';
        vm.showExportDialog = 0;
        vm.exportSet = null;
        // ---- opening the export dialog ----
        // One door for both callers. onExportSet passes the whole set; the bulk
        // Export button passes just the selected lineups, which used to skip
        // this check entirely and always write a plain file - losing the entry
        // link on exactly the lineups someone had picked out to send back.
        vm.openExportDialog = function (set, lineups) {
            lineups = (lineups instanceof Array) ? lineups : set.Lineups;

            // #Import# on the set is no longer part of the test. It was a proxy
            // for "these came from the site", and the lineup names say that
            // directly and per-lineup - which is what a selection needs.
            if (!vm.isIdLinkedLineups(lineups)) {
                vm.onExportLineups(lineups, set);
                return;
			}

            vm.exportSet = set;
            vm.exportLineups = lineups;
            vm.exportContestList = vm.exportContests(lineups);
            vm.exportDialogComplete = false;
            vm.exportDialogError = "";
            vm.exportDialogWarning = "";
            vm.showExportDialog = 1;
		};

        vm.exportLineups = [];
        vm.exportContestList = [];

        vm.onExportSet = function (set) {
            vm.openExportDialog(set, set.Lineups);
		};

        vm.onDialogExport = function (asNew, splitByContest) {
            if (asNew) {
                vm.showExportDialog = 0;
                vm.onExportLineups(vm.exportLineups, vm.exportSet);
                return;
			}
            vm.exportFromJs(vm.exportSet, vm.exportLineups, splitByContest);
		};
        // ══ Is this list still tied to DFS entries? ═══════════════════════════
        // A lineup name of "entryId:contestId" IS the link - it is the only
        // thing that survives a reload, and it is what lets a swapped lineup go
        // back into the entry it came from.
        //
        // Lives here as a list predicate rather than a set one because the bulk
        // Export button works on a selection, which onExportSet's whole-set
        // check could not see.
        vm.lineupEntryLink = function (l) {
            if (l == null || l.Name == null) { return null; }
            var s = String(l.Name).split(':');
            if (s.length !== 2 || !s[1].length) { return null; }
            if (isNaN(parseInt(s[0], 10))) { return null; }
            return { entryId: s[0], contestId: s[1] };
		};

        // Every lineup, not most: a half-linked list would write a file the site
        // rejects at the first unlinked row.
        vm.isIdLinkedLineups = function (lineups) {
            if (!(lineups instanceof Array) || !lineups.length) { return false; }
            for (var i = 0; i < lineups.length; i++) {
                if (vm.lineupEntryLink(lineups[i]) == null) { return false; }
			}
            return true;
		};

        // Distinct contests in the list, first-seen order, with counts. Named
        // from ContestName when it is still around (same session as the import);
        // after a reload only the id survives, which is why the id is the key.
        vm.exportContests = function (lineups) {
            var seen = {}, out = [];
            for (var i = 0; i < (lineups || []).length; i++) {
                var lk = vm.lineupEntryLink(lineups[i]);
                if (lk == null) { continue; }
                if (seen[lk.contestId] != null) { seen[lk.contestId].n++; continue; }
                seen[lk.contestId] = { id: lk.contestId, n: 1, name: String(lineups[i].ContestName || '').trim() };
                out.push(seen[lk.contestId]);
			}
            return out;
		};

        // ---- writing the file ----
        // `lineups` is the list to write - the whole set, or just the selection
        // from the bulk Export button. splitByContest emits one file per contest
        // instead of one containing all of them.
        vm.exportFromJs = function (set, lineups, splitByContest) {
            lineups = (lineups instanceof Array) ? lineups : set.Lineups;

            var slate = vm.getSlate(set.SetInfo.SlateId);
            vm.exportDialogError = "";
            vm.exportDialogWarning = "";
            if (slate == null) {
                vm.exportDialogError = "Slate not found";
                return;
			}

            var itemKey = "" + vm.Site + "_" + vm.Sport + "_" + slate.Id;
            var map = vm.getLimitedStorageItem('dfsmap', itemKey);
            if (map == null) {
                vm.exportDialogError = 'Player Map not found - reupload a lineups set from this slate.';
                return;
			}

            var posList = '';
            for (var i = 0; i < slate.LineupRequirements.length; i++) {
                if (posList.length > 0) { posList += ","; }
                posList += slate.LineupRequirements[i].PositionName;
			}

            var header, sIdx, eIdx = 0, cIdx = 0, quoutes = 0, prefix = '';
            if (vm.Site == 1) {
                header = 'Entry ID,Contest Name,Contest ID,Entry Fee,' + posList + ',,Instructions';
                sIdx = 4;
                cIdx = 2;
			} else if (vm.Site == 2) {
                header = 'entry_id,contest_id,contest_name,entry_fee,' + posList + ',"","Instructions"';
                sIdx = 4;
                quoutes = 1;
                cIdx = 1;
                prefix = slate.DfsSlateId.toString() + "-";
			} else if (vm.Site == 4) {
                header = 'Contest Title,Entry Fee,Prizes,Contest ID,Entry ID,' + posList + '," ",Instructions,ID';
                sIdx = 5;
                eIdx = 4;
                cIdx = 3;
			}

            // One row. Returns null when a player cannot be resolved back to the
            // site's own id - that row has to be dropped rather than written
            // half-formed, because the site reads the whole file or none of it.
            var buildRow = function (l) {
                var lk = vm.lineupEntryLink(l);
                if (lk == null) { return null; }

                var line = '';
                for (var j = 0; j < sIdx; j++) {
                    if (j == eIdx) { line += lk.entryId; }
                    if (j == cIdx) { line += lk.contestId; }
                    line += ",";
				}

                for (var j = 0; j < l.LineupItems.length; j++) {
                    var li = l.LineupItems[j];
                    var item = vm.getDfsMappedItem(map, li.Salary.Name, li.Salary.SAL);
                    if (item == null) { return null; }

                    if (quoutes) { line += '"'; }
                    if (prefix.length > 0) { line += prefix; }
                    line += item.ID;
                    if (quoutes) { line += '"'; }
                    line += ",";
				}
                return line;
			};

            // group -> rows. One bucket unless splitting.
            var groups = [], byId = {}, exported = 0, expErrors = 0;
            for (var i = 0; i < lineups.length; i++) {
                var l = lineups[i];
                var row = buildRow(l);
                if (row == null) { expErrors++; continue; }

                var lk = vm.lineupEntryLink(l);
                var key = splitByContest ? lk.contestId : '_all';
                if (byId[key] == null) {
                    byId[key] = { key: key, contestId: lk.contestId, rows: [] };
                    groups.push(byId[key]);
				}
                byId[key].rows.push(row);
                exported++;
			}

            if (expErrors > 0) {
                vm.exportDialogWarning = expErrors + ' lineup' + (expErrors === 1 ? '' : 's') + ' could not be exported. Check that the slate selected here is the one those entries belong to.';
			}

            if (!exported) {
                vm.exportDialogError = 'Nothing could be exported from this set.';
                return;
			}

            for (var g = 0; g < groups.length; g++) {
                var suffix = splitByContest ? ('_contest' + groups[g].contestId) : '';
                vm.downloadCsv([header].concat(groups[g].rows).join('\r\n'),
                    "LineStar_LateSwapExport_" + LineStar.SportName + "_" + vm.siteName + "_" + slate.Id + suffix + ".csv");
			}

            vm.exportDialogComplete = true;
            vm.exportDialogError = (groups.length > 1)
                ? ('Exported ' + exported + ' lineups across ' + groups.length + ' files.')
                : ('Exported ' + exported + ' lineup' + (exported === 1 ? '.' : 's.'));
		};

        vm.downloadCsv = function (data, filename) {
            var csvData = new Blob(["\uFEFF" + data], { type: 'text/csv;charset=utf-8;' });
            var csvUrl = URL.createObjectURL(csvData);
            var he = document.createElement('a');
            he.href = csvUrl;
            he.target = '_blank';
            he.download = filename;
            he.click();
		};
        // The export side of the same name match. It has to fold names exactly
        // the way findPlayerFromDKData does, or the two disagree: a player the
        // import accepted would fail to resolve on the way out, and the lineup
        // would be dropped from the file with only a count to show for it.
        vm.getDfsMappedItem = function (map, pname, sal) {
            var key = vm.keyProjName(pname);
            if (!key) { return null; }

            var loose = null;
            for (var i = 0; i < (map || []).length; i++) {
                var m = map[i];
                if (vm.keyProjName(m.Name) !== key) { continue; }

                // salary agreeing too is the confident hit; a name-only match is
                // kept as a fallback rather than returned over one
                if (m.Salary == sal) { return m; }
                if (loose == null) { loose = m; }
			}
            return loose;
		};


        vm.mergeSet = null;
        vm.mergeSetsList = [];

        vm.onMergeSet = function (set) {
            vm.mergeSet = set;
            vm.showMatchupSetsPopup = true;
            vm.mergeSetsList = [];

            var sets = vm.periodData.Sets;
            for (var i = 0; i < sets.length; i++) {
                var s = sets[i];
                if (set != null && set == s) {
                    continue;
                }
                if (set != null && set.SetInfo.SlateId == s.SetInfo.SlateId) {
                    vm.mergeSetsList.push(s);
                }
            }
        };

        vm.isLineupDuplicate = function (lineups, lineup) {
            var dupe = 0;
            for (var i = 0; i < lineups.length; i++) {
                var l = lineups[i];
                if (l.Salary != lineup.Salary) {
                    continue;
                }

                var same = 0;

                for (var j = 0; j < lineup.LineupItems.length; j++) {
                    for (var k = 0; k < l.LineupItems.length; k++) {
                        if (lineup.LineupItems[j].SalaryId == l.LineupItems[k].SalaryId) {
                            same++;
                            break;
                        }
                    }
                }

                if (same == lineup.LineupItems.length) {
                    dupe++;
                    break;
                }
            }
            return (dupe > 0);
        };

        vm.onMergeSetWithSet = function (set) {
            if (vm.mergeSet == null) return;

            var stuck = 0;
            var merged = 0;
            var save = 0;
            var duplicate = 0;

            for (var i = 0; i < set.Lineups.length; i++) {
                if (vm.mergeSet.Lineups.length < 150) {
                    merged++;
                    if (!vm.isLineupDuplicate(vm.mergeSet.Lineups, set.Lineups[i])) {
                        vm.mergeSet.Lineups.push(set.Lineups[i]);
                    } else {
                        duplicate++;
                    }
                } else {
                    stuck++;
                }
            }

            if (merged > 0) {
                vm.mergeSet.needsSave = 1;
                set.Lineups.splice(0, merged);
                vm.processLineupSetStatsSet(set);
                vm.processLineupSetStatsSet(vm.mergeSet);
                save++;
            }

            var dupText = (duplicate > 0) ? ' Discarded ' + duplicate + ' duplicate lineups' : '';

            if (stuck == 0) {
                vm.onDeleteSet(set);
                vm.showtoast('The sets were successfully merged.' + dupText);
            }
            else if (stuck > 0) {
                set.needsSave = 1;
                save++;
                vm.showtoast('The set exceeded 150 lineups, ' + stuck + '  remain unmerged.' + dupText);
            }

            if (save > 0) {
                vm.saveSetChanges_debounce();
            }

            vm.updateLineupSetCounts();

            vm.mergeSetsList = [];
            vm.mergeSet = null;
            vm.showMatchupSetsPopup = false;
        };

        vm.onExportLineups = function(lineups, set){
            if (lineups == null || lineups.length < 1) {
                vm.showtoast('Unable to export - no lineups found.');
                return;
            }
            if (vm.Site == 2) {
                vm.fanDuelExport(lineups, set);
                return;
            }
            var si = set.SetInfo;
            var slate = vm.getSlate(si.SlateId);
            var lrs = slate.LineupRequirements;
            var reqs = (lrs != null && lrs.length > 0) ? lrs : vm.periodData.LineupRequirements;
            var errorCnt = 0;
            var str = '';
            for (var i = 0; i < lineups.length; i++) {
                if (i > 0) { str += ';'; }
                var lineup = lineups[i];
                var lis = lineup.LineupItems;
                if (lis.length != reqs.length) {
                    errorCnt++;
                    break;
                }
                for (var j = 0; j < lis.length; j++) {
                    if (j > 0) { str += ','; }
                    if (lis[j] != null) {
                        str += lis[j].SalaryId;
                    } else {
                        errorCnt++;
                    }
                }
            }
            if (errorCnt > 0) {
                vm.showtoast('Unable to export set, 1 or more lineup is not valid.');
                return;
            }
            if (str.length > 5) {
                LineStarUtility.openPostUrl("/DesktopModules/DailyFantasyApi/API/Fantasy/ExportLineupSet",
                    { Sport: si.Sport, Site: si.Site, SlateId: si.SlateId, Extra: str });
            }
        };

        vm.fanDuelExport = function (lineups, set) {
            if (set == null || lineups == null || lineups.length < 1) {
                vm.showtoast('Unable to export - no lineups found.');
                return;
            }
            var str = '';
            var si = set.SetInfo;
            var slate = vm.getSlate(si.SlateId);
            var lrs = slate.LineupRequirements;
            var reqs = (lrs != null && lrs.length > 0) ? lrs : vm.periodData.LineupRequirements;
            var errorCnt = 0;

            for (var i = 0; i < reqs.length; i++) {
                var r = reqs[i];
                str += r.PositionName + ',';
            }
            str += '\r\n';

            for (var i = 0; i < lineups.length; i++) {
                var lineup = lineups[i];
                var lis = lineup.LineupItems;
                if (lis.length != reqs.length) {
                    errorCnt++;
                    break;
                }
                for (var j = 0; j < lis.length; j++) {
                    var l = lis[j];
                    var s = (l != null) ? l.Salary : null;
                    if (s != null) {
                        str += slate.DfsSlateId + '-' + s.DSPID + ',';
                    } else {
                        errorCnt++;
                    }
                }
                str += '\r\n';
            }
            if (errorCnt > 0) {
                vm.showtoast('Unable to export set, 1 or more lineup is not valid.');
                return;
            }

            var csvData = new Blob(["\uFEFF" + str], { type: 'text/csv;charset=utf-8;' });
            var csvUrl = URL.createObjectURL(csvData);
            var he = document.createElement('a');
            he.href = csvUrl;
            he.target = '_blank';
            he.download = "LineStar_" + LineStar.SportName + "_" + slate.SlateName + '_' + slate.DfsSlateId + '.csv';
            he.click();
        };

        vm.onDeleteLineup = function(set, lineup){
            var idx = set.Lineups.indexOf(lineup);
            if(idx >= 0){
                var ele = $('.lineupSet[data-setid="' + set.SetInfo.LocalId + '"]');
                var lCont = ele.find('.lineupSetLineupsList[data-idx="' + idx + '"]');
                lCont.hide("slow", function () {
                    $scope.$apply(() => {
                        set.Lineups.splice(idx, 1);
                        set.needsSave = 1;
                        vm.processLineupSetStatsSet(set);
                        vm.saveSetChanges_debounce();
                    });
                    //$scope.$digest();
                });
            }
		};

        // ---- bulk lineup selection: per-lineup checkboxes + the action bar ----
        vm.onLineupSelectChanged = function (set) {
            if (!set || !set.Lineups) { return; }
            var n = 0;
            for (var i = 0; i < set.Lineups.length; i++) { if (set.Lineups[i].Selected) { n++; } }
            set.selectedCnt = n;
        };
        vm.getSelectedLineups = function (set) {
            return (set && set.Lineups) ? set.Lineups.filter(function (l) { return l.Selected; }) : [];
        };
        vm.onClearLineupSelection = function (set) {
            if (!set || !set.Lineups) { return; }
            for (var i = 0; i < set.Lineups.length; i++) { set.Lineups[i].Selected = false; }
            set.selectedCnt = 0;
        };
        vm.onSelectAllLineups = function (set) {
            if (!set || !set.Lineups) { return; }
            for (var i = 0; i < set.Lineups.length; i++) { set.Lineups[i].Selected = true; }
            vm.onLineupSelectChanged(set);
        };
        vm.onExportSelectedLineups = function (set) {
            var sel = vm.getSelectedLineups(set);
            if (!sel.length) { return; }
            // through the same door as Export Set, so a selection of imported
            // lineups gets the ID-linked option too instead of silently
            // exporting as a plain file
            vm.openExportDialog(set, sel);
        };
        vm.onDeleteSelectedLineups = function (set) {
            var sel = vm.getSelectedLineups(set);
            if (!sel.length) { return; }
            set.Lineups = set.Lineups.filter(function (l) { return !l.Selected; });
            set.selectedCnt = 0;
            set.needsSave = 1;
            vm.processLineupSetStatsSet(set);
            vm.saveSetChanges_debounce();
        };
        vm.onMoveSelectedLineups = function (set) {
            var sel = vm.getSelectedLineups(set);
            if (!sel.length) { return; }
            vm.movingLineups = sel;
            vm.movingFromSet = set;
            vm.movingLineup = null;
            vm.mergeSetsList = [];
            vm.moveLineupToSets = [];
            var sets = vm.periodData.Sets;
            for (var i = 0; i < sets.length; i++) {
                var s = sets[i];
                if (s === set) { continue; }
                if (set.SetInfo.SlateId == s.SetInfo.SlateId) { vm.moveLineupToSets.push(s); }
            }
            vm.showMatchupSetsPopup = true;
        };

        // tap anywhere on a lineup card (except the interactive bits) toggles selection
        // #lineupsDialog's click handler. documentClick() closes any open
        // ShowItem dropdown (Sort / lineup more / replace-player), and the
        // stopPropagation keeps in-dialog clicks off the OUTER document
        // handler. But .playername relies on a document-level delegate in
        // NewLayoutWrapper to open the player popup - swallowing the bubble
        // silently killed player taps inside this view, so those are let
        // through. (Same trap the stacks view avoids by having no
        // stopPropagation at all.)
        vm.luDialogClick = function (event) {
            vm.documentClick();
            if (event && event.target && $(event.target).closest('.playername').length) { return; }
            if (event) { event.stopPropagation(); }
        };

        vm.onLineupCardClick = function (set, lineup, event) {
            if ($(event.target).closest('.playername, .lineupItemMore, .lineupMore, .lineupSetDropDown, .lineupSelectChk, .lineupNameEdit, a, input, button, select').length) {
                return;
            }
            lineup.Selected = !lineup.Selected;
            vm.onLineupSelectChanged(set);
        };
        // pen icon: swap the lineup-name label for an editable field and focus it
        vm.startEditLineupName = function (lineup, event) {
            if (event) { event.stopPropagation(); }
            lineup.Editing = true;
            setTimeout(function () {
                var el = document.getElementById('lineupName_' + lineup.Id);
                if (el) { el.focus(); el.select(); }
            }, 0);
        };

        // ---- lineups TABLE view (page table mode, !cardMode) ----
        // One row per lineup, roster slots as columns. Sorting is done here
        // rather than a template orderBy so the third header click cleanly
        // returns to the set's natural order.
        vm.luTableSort = null;
        vm.luTableSortDesc = true;
        vm.setLuTableSort = function (key) {
            if (vm.luTableSort === key) {
                if (vm.luTableSortDesc) { vm.luTableSortDesc = false; }
                else { vm.luTableSort = null; }          // 3rd click: natural order
            } else {
                vm.luTableSort = key;
                vm.luTableSortDesc = true;
            }

            // Keep the "Sort: X" button in step - it sits directly above this
            // table, so a header click used to leave it naming a different
            // field. null (3rd click) maps to 3 / Default, which is the same
            // as-optimized order the header just restored.
            var meth = (vm.luTableSort == null) ? 3 : vm.luMethodBySortKey[vm.luTableSort];
            if (meth != null) {
                vm.lineupSortMethod = meth;
                LineStarUtility.saveSettingInt("lineupSortMethod", meth);
                // re-order the underlying arrays too, so switching back to the
                // card view doesn't show a different order than the table did
                var sets = (vm.periodData && vm.periodData.Sets) ? vm.periodData.Sets : [];
                for (var i = 0; i < sets.length; i++) { vm.sortLineupsBySetting(sets[i]); }
            }
        };
        vm.luTableRows = function (set) {
            var rows = $filter('filterSetsByUser')(set.Lineups, set);
            if (!vm.luTableSort) { return rows; }
            var key = vm.luTableSort, dir = vm.luTableSortDesc ? -1 : 1;
            return rows.slice().sort(function (a, b) { return ((a[key] || 0) - (b[key] || 0)) * dir; });
        };
        vm.luSetHasScores = function (set) {
            if (set == null || set.Lineups == null) { return false; }
            for (var i = 0; i < set.Lineups.length; i++) {
                if (set.Lineups[i].PS > 0) { return true; }
            }
            return false;
        };
        // hover title for a table player cell - the card view's per-player
        // detail (team/opp, salary, proj, own, scored) compressed into text
        vm.luCellTip = function (li) {
            if (li == null || li.Salary == null) { return ''; }
            var s = li.Salary;
            var parts = [];
            if (s.PTEAM) { parts.push(s.PTEAM + (s.OTEAM_VS ? ' ' + s.OTEAM_VS : '')); }
            parts.push('$' + vm.getSalaryFromSlot(li));
            parts.push('proj ' + vm.getPointsProjectedFromSlot(li));
            if (s.SlateOwnership != null) { parts.push(s.SlateOwnership + '% own'); }
            if (s.PS > 0) { parts.push('scored ' + vm.getLineupItemScored(li)); }
            return parts.join(' · ');
        };

        vm.saveSetChanges = function(){
            //console.log('save set changes');

            var sets = vm.periodData.Sets;
            for (var i = 0; i < sets.length; i++){
                var set = sets[i];
                // A V4 stream fills its set live, and this function saves EVERY
                // set rather than just the one that changed - so any unrelated
                // action during a run (liking a lineup, renaming a set) would
                // persist a half-finished set. Worse, a run that ends with zero
                // lineups deletes its set locally, which would leave that save
                // orphaned server-side. The streaming set saves once, from
                // finish(), when the terminal line has arrived.
                if (set.isStreaming) { continue; }
                webService.saveLineupSet(function(data) {
                    if (set.isImportSet) {
                        set.isImportSet = false;
                        var success = (data == "OK") ? 1 : 0;
                        // only one set of an import wears the flag, so this
                        // fires once however many contests were split out
                        var n = vm.dfsImportSetCount || 1;
                        vm.updateDFSCsvMsg(success
                            ? ('Imported into ' + n + (n === 1 ? ' new set.' : ' new sets, one per contest.'))
                            : 'There was a problem uploading the lineups.', 0, success);
                    }
                }, set);
            }

		};
        vm.saveSetChanges_debounce = LineStarUtility.debounce(vm.saveSetChanges, 1200);

        vm.onToggleLineupBuilder = function(){
            if(vm.showLineupBuilder == 0){
                vm.showLineupBuilder = 1;
                if (vm.autoProgressBuilderSlotFilter) {
                    var lb = vm.lineupBuilder;
                    var emptySlot = vm.getLineupBuilderEmptySlot(0, lb);
                    if (emptySlot != null) {
                        lb.activeSlotIdx = emptySlot.idx;
                        vm.updatePosFilterFromBuilderSlot(emptySlot);
                    }
                }
                // (the optimizer dialog was removed; its UI now lives in the mini)
            }else{
                vm.showLineupBuilder = 0;
            }
		};

        // --- mini lineup: per-slot hover flyout (player detail + actions) ---
        // the rail slots live inside a horizontally-scrolling overflow box, so
        // a per-slot dropdown would be clipped. Instead one body-level fixed
        // panel (m.slotTip) is positioned over whichever slot is hovered.
        // hover-intent: a short close delay lets the cursor travel from the
        // slot into the panel to click an action (Remove / Change position).
        vm.slotTip = null;
        vm.slotTipStyle = {};
        var slotTipTimer = null;
        function clearSlotTipTimer() { if (slotTipTimer) { clearTimeout(slotTipTimer); slotTipTimer = null; } }
        vm.onSlotTipEnter = function (slot, evt) {
            clearSlotTipTimer();
            if (evt && evt.currentTarget) {
                var r = evt.currentTarget.getBoundingClientRect();
                var left = Math.max(8, Math.min(r.left, window.innerWidth - 248));
                vm.slotTipStyle = { top: (r.bottom + 6) + 'px', left: left + 'px' };
            }
            vm.slotTip = slot;
        };
        vm.onSlotTipHold = function () { clearSlotTipTimer(); };
        vm.onSlotTipLeave = function () {
            clearSlotTipTimer();
            slotTipTimer = setTimeout(function () {
                slotTipTimer = null;
                $scope.$apply(function () { vm.slotTip = null; });
            }, 250);
        };
        vm.closeSlotTip = function () { clearSlotTipTimer(); vm.slotTip = null; };
        // "Examine player" - same as clicking a player name: open the player
        // popup dialog. queryPlayerPop lives on the wrapper (fscInfo.vm) and
        // reads data-playerid off a jQuery element; defer it past this digest
        // so its own redigest/$apply doesn't collide with ours.
        vm.examineSlotPlayer = function () {
            var sal = (vm.slotTip && vm.slotTip.salary) ? vm.slotTip.salary : null;
            vm.closeSlotTip();
            if (sal && typeof fscInfo !== 'undefined' && fscInfo.vm && fscInfo.vm.queryPlayerPop) {
                setTimeout(function () {
                    fscInfo.vm.queryPlayerPop($('<span data-playerid="' + sal.PID + '"></span>'));
                }, 0);
            }
        };

        // the empty builder slot currently targeted (for the mini-rail hint),
        // or null when none is active / it's already filled
        vm.activeBuilderSlot = function () {
            var lb = vm.lineupBuilder;
            if (!lb || lb.activeSlotIdx == null || lb.activeSlotIdx < 0) { return null; }
            var slots = lb.slots || [];
            for (var i = 0; i < slots.length; i++) {
                if (slots[i].idx === lb.activeSlotIdx) {
                    return (slots[i].salary == null) ? slots[i] : null;
                }
            }
            return null;
        };

        // clear the targeted builder slot + the position filter it applied
        // (same effect as closing the optimizer). Surfaced via the hint's Clear button.
        vm.clearActiveBuilderSlot = function () {
            if (vm.lineupBuilder) { vm.lineupBuilder.activeSlotIdx = -1; }
            if (vm.filterPos) { vm.filterPos(null); }
        };

        // closing the optimizer (toggle, dialog X, or any other path) should
        // leave no builder position active - clear the targeted slot and the
        // position filter it set.
        $scope.$watch(function () { return vm.showLineupBuilder; }, function (nv, ov) {
            if (ov && !nv) {
                if (vm.lineupBuilder) { vm.lineupBuilder.activeSlotIdx = -1; }
                if (vm.filterPos) { vm.filterPos(null); }
            }
        });

        // While a builder slot is targeted ("Select a X to fill this spot"), flag
        // the body so the row lock buttons highlight - it cues the user that
        // tapping lock sends that player to the builder.
        $scope.$watch(function () { return !!vm.activeBuilderSlot(); }, function (active) {
            $('body').toggleClass('fscBuilderSlotActive', !!active);
        });

        // Optimizer "Teams" tile. Its only caller is the flyout's main pane, so
        // this always opens in-place rather than in the centered dialog - same
        // reasoning as the stack team picker (the dialog sits at a lower
        // z-index than the flyout and lands mid-screen).
        // teamPopupSelectorMode still gets set: the shared handlers
        // (onFilterAllTeams, onTeamIncludeChanged) branch on it.
        vm.showExcludeTeamsPopup = function(){
            vm.teamPopupSelectorMode = 0;
            vm.dismissTooltips();
            vm.optSettingsOpen = false;
            vm.optModelsOpen = false;
            vm.optStacksOpen = false;
            vm.optStackOptionsOpen = false;
            vm.optStackTeamsOpen = false;
            vm.optExcludeTeamsOpen = true;
            vm.sizeTeamsFlyoutSoon();
        };
        // back out of the include/exclude picker to the optimizer's main pane
        vm.closeExcludeTeamsPane = function () {
            vm.dismissTooltips();
            vm.clearTeamsFlyoutSize();
            vm.optExcludeTeamsOpen = false;
            // These three were missing: closing the panel from a Player
            // Groups or Position Stacks pane left its flag set, which kept
            // .lbMiniSettingsPinned on and the panel open.
            vm.optGroupsOpen = false;
            vm.optGroupPlayersOpen = false;
            vm.optPosStacksOpen = false;
        };

        // ══ Lineup builder, seen from the optimizer ═══════════════════════════
        // The builder rail and the optimizer are the same decision viewed twice:
        // every FILLED slot is a player the optimizer is told to keep
        // (optObj.lockedPlayers), and every empty one is a slot it fills. That
        // relationship was invisible from inside the settings dialog - you had
        // to close it, look at the rail, and count.
        //
        // "Locked" here is the optimizer's word, not the builder's: the builder
        // calls it filled. Same slots, and the payload is built from exactly
        // this - see onLineupOptimizeV4's lockedPlayers loop.
        vm.builderLockedCount = function () {
            return (vm.lineupBuilder != null) ? (vm.lineupBuilder.SlotsFilled || 0) : 0;
		};

        vm.builderOpenCount = function () {
            if (vm.lineupBuilder == null || !(vm.lineupBuilder.slots instanceof Array)) { return 0; }
            return vm.lineupBuilder.slots.length - (vm.lineupBuilder.SlotsFilled || 0);
		};

        // The optRow's value. Short by necessity - it shares a 44px row with the
        // label - so it leads with whatever is actually notable: nothing locked
        // is the common case and says so in two words.
        vm.builderSummaryStr = function () {
            var lb = vm.lineupBuilder;
            if (lb == null || !(lb.slots instanceof Array) || !lb.slots.length) { return ''; }

            var locked = vm.builderLockedCount();
            if (!locked) { return 'All ' + lb.slots.length + ' open'; }
            if (locked === lb.slots.length) { return 'Full - nothing to fill'; }
            return locked + ' locked, $' + lb.SalLeft + ' left';
		};

        // The pane's own line, which has room for the whole picture.
        vm.builderPaneSummaryStr = function () {
            var lb = vm.lineupBuilder;
            if (lb == null || !(lb.slots instanceof Array) || !lb.slots.length) { return ''; }

            var open = vm.builderOpenCount();
            if (!open) { return 'Every slot is locked - the optimizer has nothing left to fill.'; }

            return open + ' slot' + (open === 1 ? '' : 's') + ' to fill with $' +
                   lb.SalLeft + ', about $' +
                   lb.SalLeftPerSlot + ' each.';
		};

        vm.openBuilderPane = function () {
            vm.dismissTooltips();
            vm.closeOptimizerPanes();
            vm.optBuilderOpen = true;
		};

        vm.closeBuilderPane = function () {
            vm.dismissTooltips();
            vm.optBuilderOpen = false;
		};

        // Unlock from inside the dialog. Same call the rail's slot X makes, with
        // allowSlotChange false: that flag re-filters the player table to the
        // freed position, which is right when you are standing at the rail about
        // to refill it and pointless behind a modal.
        vm.unlockBuilderSlot = function (slot) {
            if (slot == null || slot.salary == null) { return; }
            vm.onLineupBuilderClearSlot(slot, false);
            vm.updateLineupBuilderValues();
            vm.saveLineupBuilder();
		};

        vm.itemToHide = null;
        vm.showAngularItem = function (item) {
            vm.hideAngularItemsOnClick();
            item.ShowItem = true;
            vm.itemToHide = item;
        };

        vm.hideAngularItemsOnClick = function () {
            if (vm.itemToHide != null) {
                vm.itemToHide.ShowItem = false;
                vm.itemToHide = null;
            }
        };

        vm.hidePopupElementsOnClick = function(force){
            if(vm.hideElementOnClick != null && (vm.hideClickCnt++ > 0 || force)){
                vm.hideElementOnClick.hide();
                vm.hideElementOnClick.length = 0;
                vm.hideClickCnt = 0;
            }
		};

        vm.onAdvancedSorterColSelected = function(str, evnt, idx){
            vm.matchupDataSorterColIdx = idx;
            vm.sortDesc = vm.matchupDataSorter.ColumnsSortDir[vm.matchupDataSorterColIdx];

            vm.filter_debounceShort();
		};

        // ---- Sort-menu cascade: the advanced (matchup data) pickers live INSIDE
        // the sort dropdown now (the old advMatchupSorters/-Columns toolbar
        // dropdowns are gone). sortMenuPane 0 = sorter list, 1 = matchup drill-in;
        // sortMenuCat = which dataset's column accordion is expanded.
        vm.sortMenuPane = 0;
        vm.sortMenuCat = null;

        vm.openAdvancedSortPane = function (evnt) {
            vm.sortMenuPane = 1;
            // auto-expand the active dataset when an advanced sort is already on
            vm.sortMenuCat = (vm.sortMethod == -1 && vm.matchupDataSorter != null) ? vm.matchupDataSorter : null;
            if (evnt != null) { evnt.stopPropagation(); evnt.preventDefault(); }
        };

        // one tap applies dataset + column (order matters: selecting the dataset
        // resets the column index to its default SortCol) and persists, matching
        // what picking "Advanced" in the old menu + both dropdowns did.
        vm.pickAdvancedSort = function (pmd, colIdx, evnt) {
            vm.onAdvancedSorterSelected(pmd, evnt);
            vm.onAdvancedSorterColSelected(pmd.Columns[colIdx], evnt, colIdx);
            vm.saveSortMethod();
        };

        vm.onAdvancedSorterSelected = function(sorter, evnt){
            vm.matchupDataSorter = sorter;
            vm.matchupDataSorterLast = sorter;
            vm.matchupDataSorterColIdx = parseInt(sorter.SortCol);
            vm.sortDesc = sorter.ColumnsSortDir[vm.matchupDataSorterColIdx];

            // a matchup-data sort IS the "Advanced" sorter - reflect that in the
            // main sorter button so tapping a matchup stat name (matchupTableMiniName)
            // shows "Advanced" as the active sort.
            vm.sortMethod = -1;
            if (vm.getSorterMethod) { vm.selectedSorter = vm.getSorterMethod(-1); }

            vm.filter_debounceShort();
		};

        vm.onSorterSelected = function(sorter, evnt){

            if(sorter.Method == -1){
                if(vm.matchupDataSorter == null){
                    vm.matchupDataSorter = (vm.matchupDataSorterLast != null) ? vm.matchupDataSorterLast : vm.periodData.MatchupData[0];
                    vm.matchupDataSorterColIdx = parseInt(vm.matchupDataSorter.SortCol);
                    vm.sortDesc = vm.matchupDataSorter.ColumnsSortDir[vm.matchupDataSorterColIdx];
				}
      
			}else{
                vm.matchupDataSorter = null;
                vm.matchupDataSorterColIdx = -1;

                if(vm.sortMethod == sorter.Method){
                    vm.sortDesc = vm.sortDesc ? 0 : 1;
			    }else{
                    vm.sortDesc = 1;     
			    }
			}

            vm.sortMethod = sorter.Method;
            vm.selectedSorter = sorter;
            vm.saveSortMethod();
            vm.filter_debounceShort();

            return false;
		};

        vm.onShowMatchupColumn = function(t){
            /*var idx = parseInt(t.attr('data-idx'));
            var mid = t.parents('.matchupTable').attr('data-id');

            vm.dynamic.dataCol0 = { idx:idx, id:mid, vis:true, name:'' };

            var pmd = vm.getMatchupDataColById(mid);
            vm.dynamic.dataCol0.name = pmd.Columns[idx];

            //Save this column
            var json = JSON.stringify(vm.dynamic.dataCol0);
            localStorage.setItem("dataCol0_" + LineStar.Sport + '_' + LineStar.Site, json);

            //Save the sort method
            vm.sortMethod = 22;
            vm.sortDesc = 1;
            vm.saveSortMethod();*/
		};

        vm.onRefreshSalaryInfo = function(){
            vm.showRefreshAlertMsg = false;
            vm.clearFilters();
            vm.salaryListForSelSlate = [];
            vm.refreshSalaryData();
		};

        /*vm.onUpdateTableSliderVis = function(){
            if(!vm.showLeftRightScrollControls){
                return;  
		    }
            var table =  $(".projections__module");
            if(table.length){
                var tableInnerWidth = table.innerWidth();
                var tableScrollWidth = table[0].scrollWidth;
                var tableScrollLeft= table.scrollLeft();

                if((tableScrollWidth-tableScrollLeft) > tableInnerWidth){
                    $('.customSliderRight').show();
			    }else{
                    $('.customSliderRight').hide();     
			    }
                if(tableScrollLeft > 0){
                    $('.customSliderLeft').show();
			    }else{
                    $('.customSliderLeft').hide();     
			    }
            }
		};
        vm.updateTableSliderVisDebounce = LineStarUtility.debounce(vm.onUpdateTableSliderVis, 200);*/

        vm.showOptimizerView = function () {
            vm.showProjections = 1;
            vm.showLineupBuilder = 1;
        };
        // My Lineups is a movable/resizable dialog showing one set at a
        // time (chosen by the header selector). showProjections is left on
        // the underlying main view so the dialog floats over it.
        vm.showLineupsDialog = 0;
        vm.lineupsDialogSet = null;
        // open/close state for the custom 2-line set dropdown (ShowItem
        // pattern, closed by documentClick like the other dialog dropdowns)
        vm.setSelectMenu = { ShowItem: false };

        // when the displayed set changes (New Set / Merge / Swaptimize / picking one,
        // etc.) flash the set picker + slide-fade the body so it's obvious the set
        // just switched. Driven by a single watch so every path gets the cue.
        vm.flashSelectedSet = function () {
            setTimeout(function () {
                var sel = document.querySelector('#lineupsDialog .luDlgSetSelect');
                if (sel) { sel.classList.remove('luDlgSetFlash'); void sel.offsetWidth; sel.classList.add('luDlgSetFlash'); }
                var body = document.querySelector('#lineupsDialog .luDlgBody');
                if (body) { body.classList.remove('luDlgSwap'); void body.offsetWidth; body.classList.add('luDlgSwap'); }
            }, 80);
        };
        $scope.$watch(function () { return vm.lineupsDialogSet; }, function (newSet, oldSet) {
            // flashSelectedSet no-ops if the dialog isn't rendered, so no extra guard needed
            if (newSet && newSet !== oldSet) { vm.flashSelectedSet(); }
        });

        // exposure panel tabs: 'players' (Player Exposures, the default/first tab) |
        // 'team' (Team-Stack Exposure) | 'combos' (placeholder). The Team Stacks tab
        // only exists for stacking sports, so activeExpTab() falls back to Players
        // when 'team' is selected but stacking isn't available.
        vm.expTab = 'players';
        // tracks an EXPLICIT tab pick: without it the table-mode default
        // below would swallow a click on Players (its value is also the
        // initial default), making that tab unreachable in table mode
        vm.expTabChosen = false;
        vm.setExpTab = function (t) { vm.expTab = t; vm.expTabChosen = true; };
        vm.activeExpTab = function () {
            // page TABLE mode hides the lineup cards, so Lineups is the
            // DEFAULT tab there - only until the user picks another one
            if (!vm.cardMode && !vm.expTabChosen) { return 'lineups'; }
            // Lineups tab doesn't exist in card mode (the cards are the lineups)
            if (vm.cardMode && vm.expTab === 'lineups') { return 'players'; }
            return (vm.expTab === 'team' && !vm.shouldShowStackFinder) ? 'players' : vm.expTab;
        };

        // inline rename of the selected set (the picker isn't editable, so
        // the pencil swaps it for a text field + save/cancel). Edits go to a
        // temp value and only commit on Save, so Cancel discards them.
        vm.renamingSet = false;
        vm.renameValue = '';
        vm.startRenameSet = function ($event) {
            if ($event) { $event.stopPropagation(); }
            if (!vm.lineupsDialogSet) { return; }
            vm.setSelectMenu.ShowItem = false;
            vm.renameValue = vm.lineupsDialogSet.SetInfo.SetName;
            vm.renamingSet = true;
            setTimeout(function () {
                var el = document.getElementById('luDlgSetRename');
                if (el) { el.focus(); el.select(); }
            }, 0);
        };
        vm.cancelRenameSet = function ($event) {
            if ($event) { $event.stopPropagation(); }
            vm.renamingSet = false;
        };
        vm.saveRenameSet = function ($event) {
            if ($event) { $event.stopPropagation(); }
            var set = vm.lineupsDialogSet;
            var v = (vm.renameValue || '').trim();
            if (set && v.length) {
                set.SetInfo.SetName = v;
                vm.onLineupSetNameChanged(set);
            }
            vm.renamingSet = false;
        };

        // The set-selector's second line: model, lineup count and date
        // (the set name is the first line). The pretty date is passed in
        // from the template (mlc.getPrettyDate lives on the parent
        // controller).
        vm.lineupSetMetaLine = function (set, prettyDate) {
            if (!set) { return ''; }
            var info = set.SetInfo;
            var model = vm.getGenerateModel(info.Model);
            var detail = [];
            if (model && model.ShortName) { detail.push(model.ShortName); }
            detail.push(info.LineupCount + ' lineups');
            if (prettyDate) { detail.push(prettyDate); }
            return detail.join('  •  ');
        };

        vm.ensureSelectedLineupSet = function () {
            var sets = vm.selectedSlateSets || [];
            if (!sets.length) { vm.lineupsDialogSet = null; return; }
            // keep a valid selection; default to the most recent set
            if (vm.lineupsDialogSet && sets.indexOf(vm.lineupsDialogSet) >= 0) { return; }
            vm.lineupsDialogSet = sets[sets.length - 1];
        };

        // drop any scroll-driven toolbar collapse (vtAutoHide/vtAutoSlim) -
        // called when swapping views so the full toolbar is present in and
        // after My Lineups, where the list-scroll handler doesn't run
        vm.resetVtAutoState = function () {
            var tb = document.querySelector('.viewToolbar');
            if (tb) {
                tb.classList.remove('vtAutoHide');
                tb.classList.remove('vtAutoSlim');
            }
        };

        // ---- mobile bottom nav (the bestball bbBottomNav pattern): view
        // tabs + sheet openers. The nav itself is CSS-hidden on desktop.
        vm.mobileFilterSheet = 0;   // the toolbar promoted to a bottom sheet (vtSheetMode)
        vm.mobileMoreSheet = 0;     // the More sheet (fscSheet dialog)
        vm.luMobilePane = 'lineups'; // mobile lineups view: 'lineups' | 'exp' (desktop shows both side by side)
        vm.bnShowProjections = function () {
            vm.showLineupsDialog = 0;
            vm.showStacksDialog = 0;
            vm.mobileFilterSheet = 0;
            vm.mobileMoreSheet = 0;
            vm.resetVtAutoState();
        };
        // the optimizer sheet's open state is a DOM class on the fsc-tap-open
        // shell, not scope state - reach in and set it
        vm.openOptimizerSheet = function () {
            vm.mobileFilterSheet = 0;
            vm.mobileMoreSheet = 0;
            var shell = document.querySelector('.lbMiniSettings.lbMiniTapOpen');
            if (shell) { shell.classList.add('is-open'); }
        };
        // filters drive the projections list - leave Lineups/Stacks first;
        // resetVtAutoState (via bnShowProjections) drops vtAutoHide so the
        // toolbar can render as the sheet
        vm.openMobileFilterSheet = function () {
            vm.bnShowProjections();
            vm.mobileFilterSheet = 1;
        };

        vm.openLineupsDialog = function () {
            vm.showLineupsDialog = 1;
            vm.showStacksDialog = 0;      // inline views swap; only one at a time
            vm.renamingSet = false;
            vm.ensureSelectedLineupSet();
            vm.showGameBar(true);
            vm.resetVtAutoState();
            vm.scheduleViewResize();
            // (no applyFscWinRect: My Lineups is now an inline view swapped into
            // the projections area, not a floating window with a saved rect)
        };

        // The inline views swap via ng-if AND the toolbar rows above them
        // (.vtFilterRow, .vtScope) ng-show off, so .projections__module's
        // distance from the top of the viewport is different in each view and
        // its pinned height has to be measured again after every switch.
        //
        // setTimeout(0) gets us past the digest that the click triggered - at
        // click time the DOM still holds the OUTGOING view. The nested rAF then
        // waits for layout, so getBoundingClientRect reads the settled position
        // rather than one mid-reflow.
        vm.scheduleViewResize = function () {
            setTimeout(function () {
                if (window.requestAnimationFrame) {
                    requestAnimationFrame(function () { vm.resizeTable(); });
                } else {
                    vm.resizeTable();
                }
            }, 0);
        };

        vm.toggleLineupsDialog = function () {
            if (vm.showLineupsDialog) {
                vm.showLineupsDialog = 0;
                vm.resetVtAutoState();
                vm.scheduleViewResize();
                return;
            }
            vm.openLineupsDialog();
        };

        // kept for any legacy callers; now opens the dialog
        vm.showMyLineupsView = function () {
            vm.openLineupsDialog();
        };

        // Stacks is an inline view swapped into the projections content
        // area, exactly like My Lineups (stackFinderCtrl is scoped to it,
        // so it loads when opened and tears down when closed).
        vm.showStacksDialog = 0;

        vm.openStacksDialog = function () {
            vm.showStacksDialog = 1;
            vm.showLineupsDialog = 0;     // inline views swap; only one at a time
            vm.showGameBar(true);
            vm.resetVtAutoState();
            vm.scheduleViewResize();
            // (no applyFscWinRect: no floating window / saved rect anymore)
        };

        vm.toggleStacksDialog = function () {
            if (vm.showStacksDialog) {
                vm.showStacksDialog = 0;
                vm.resetVtAutoState();
                vm.scheduleViewResize();
                return;
            }
            vm.openStacksDialog();
        };

        // kept for any legacy callers; now opens the dialog
        vm.showStacksView = function () {
            vm.openStacksDialog();
        };


        
        vm.onTableScrolled = function (scrollView) {
            vm.chart_debounce();
            // frozen pos/player columns: only show their right-edge separator
            // shadow once the table is actually scrolled right (see .salScrolledX).
            if (scrollView && scrollView.classList) {
                scrollView.classList.toggle('salScrolledX', scrollView.scrollLeft > 0);
            }

            // ---- toolbar auto-collapse: direction now comes ONLY from real
            // user input (wheel/touch - see onScrollIntent below, wired by
            // the scroll directive). Scroll-event deltas are untrustworthy
            // here: chart re-renders above the viewport fire scroll-anchoring
            // corrections in BOTH directions, which made delta-based logic
            // (even streak-filtered) randomly shrink/expand the bar. The one
            // thing scroll events can still safely say is POSITION: at the
            // very top the bar always shows.
            if (scrollView && vm.autoSlimToolbar == 1 && scrollView.scrollTop <= 40) {
                var tbTop = document.querySelector('.viewToolbar');
                if (tbTop && (tbTop.classList.contains('vtAutoSlim') || tbTop.classList.contains('vtAutoHide'))) {
                    tbTop.classList.remove('vtAutoSlim');
                    tbTop.classList.remove('vtAutoHide');
                    vm._vtAutoHoldUntil = Date.now() + 400;
                }
            }
            if (vm.hideGameViewOnScroll == 1) {
                var visRect = scrollView.getBoundingClientRect();
                var child = scrollView.children[0];
                var rect = child.getBoundingClientRect();
                var scrolledToTop = (scrollView.scrollTop === 0);

                if (rect.height <= (visRect.height + 91)) {
                    if (scrolledToTop) {
                        vm.showGameBar(true);
                    }
                } else {
                    vm.showGameBar(scrolledToTop);
                }

            } else {
                vm.showGameBar(true);
            }
        };

        vm.showGameBar = function (show) {
            if ($scope.$parent.$parent.mlc.updateGameBarVisible(show)) {
                vm.resizeTableDebounce();
            }
        };

        vm.hideGameViewOnScroll = LineStarUtility.loadSettingInt("hideGameViewOnScroll", 0);

        // toolbar auto-collapse, driven by REAL input (wheel/touch via the
        // scroll directive) - never by scroll events, whose direction lies
        // whenever content height mutates (chart re-renders -> anchoring
        // corrections). dir: 1 = down (collapse), -1 = up (expand).
        // Bringing the toolbar BACK needs intent. Collapsing on the way down
        // is instant, but a single upward tick - a nudge of the wheel, a
        // trackpad wobble, the tail of a fling - used to pop it open and
        // shove the table down. Expanding now requires either a sustained
        // upward run of VT_UP_SHOW_PX, or actually reaching the top.
        var VT_UP_SHOW_PX = 260;   // continuous upward travel before it returns
        var VT_UP_IDLE_MS = 500;   // a pause this long ends the run

        vm.onScrollIntent = function (dir, scrollView, px) {
            if (vm.autoSlimToolbar != 1) { return; }
            var tb = document.querySelector('.viewToolbar');
            if (!tb) { return; }
            var now = Date.now();
            // hold window: our own toggle resizes the scroll container - give
            // the layout a beat before reacting to the next gesture
            if (now < (vm._vtAutoHoldUntil || 0)) { return; }
            var autoCls = (window.innerWidth <= 800) ? 'vtAutoHide' : 'vtAutoSlim';
            // crossing the breakpoint mid-session: drop the other mode
            tb.classList.remove(autoCls === 'vtAutoHide' ? 'vtAutoSlim' : 'vtAutoHide');
            var st = scrollView.scrollTop;
            // near the BOTTOM, expanding shrinks the viewport and clamps
            // scrollTop - no expanding inside the clamp zone
            var nearBottom = (st + scrollView.clientHeight >= scrollView.scrollHeight - 180);
            var had = tb.classList.contains(autoCls);
            var want = had;

            if (dir > 0) {
                want = true;                       // scrolling down: collapse at once
                vm._vtUpPx = 0;                    // any downward motion ends an upward run
            } else if (dir < 0) {
                // only a CONTINUOUS run counts; drifting up over several
                // seconds shouldn't accumulate into an expand
                if ((now - (vm._vtUpLast || 0)) > VT_UP_IDLE_MS) { vm._vtUpPx = 0; }
                vm._vtUpLast = now;
                vm._vtUpPx = (vm._vtUpPx || 0) + (px || 0);
                if (!nearBottom && vm._vtUpPx >= VT_UP_SHOW_PX) { want = false; }
            }
            // reaching the top always shows it, no threshold to clear
            if (st <= 40) { want = false; }

            if (want !== had) {
                tb.classList.toggle(autoCls, want);
                vm._vtUpPx = 0;                    // spent - next expand starts over
                vm._vtAutoHoldUntil = now + 400;
            }
        };

        // colorblind-friendly good/bad palette (blue = good, orange = bad):
        // body.fscColorblind remaps the green/red CSS tokens; the JS-computed
        // matchup block colors branch on the flag in avgMatchupColor
        vm.colorblindMode = LineStarUtility.loadSettingInt("colorblindMode", 0);
        if (vm.colorblindMode == 1) { document.body.classList.add('fscColorblind'); }

        // ---- feature-usage analytics (Statistics consent only) ----
        // One fsc_settings snapshot per page load answers "what's popular";
        // the fsc_setting_change events in the setters (incl. everything the
        // "new look" tour toggles - it calls the same setters) answer "are
        // people switching". Deferred so every setting above is initialized,
        // and re-tried when consent is granted mid-session (fscconsent
        // CustomEvent from consent.js). Page/sport/site need no events -
        // they're in the URL, GA4 page_views already carry them.
        (function sendSettingsSnapshot() {
            var sent = false;
            function snap() {
                if (sent) { return; }
                var c = window.fscConsent && window.fscConsent.get();
                if (!c || !c.statistics) { return; }
                sent = true;
                var vals = {
                    view: vm.cardMode ? 'cards' : 'table',
                    themePref: (window.FSCTheme) ? FSCTheme.getTheme() : 'light',
                    theme: (window.FSCTheme) ? FSCTheme.getEffectiveTheme() : 'light',
                    density: vm.densityMode,
                    chart: window.FSC_CHART_V2 ? 'v2' : 'v1',
                    chartSize: window.FSC_CHART_V2_SIZE || 'medium',
                    colorblind: (vm.colorblindMode == 1) ? 'on' : 'off'
                };
                // GTM/GA4 path (lights up if the GTM tags ever get configured)
                window.fscTrack('fsc_settings', {
                    fsc_view: vals.view, fsc_theme_pref: vals.themePref,
                    fsc_theme: vals.theme, fsc_density: vals.density,
                    fsc_chart: vals.chart, fsc_chart_size: vals.chartSize,
                    fsc_colorblind: vals.colorblind
                });
                // Firestore path: ONE snapshot doc per browser per UTC day
                // (localStorage dedupe) into featureStats - read by the
                // admin dashboard (_adminFeatureStats.cshtml) via COUNT
                // aggregation queries. Anonymous by design: the id is random
                // PER DAY, so no cross-day profile can exist. Same project/
                // key as the consent receipts (fantasysportsco.consent.js);
                // create-only rules are the security boundary.
                try {
                    var day = new Date().toISOString().slice(0, 10);
                    if (localStorage.getItem('fscStatsD') === day) { return; }
                    if (!window.fetch) { return; }
                    var rnd = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
                    fetch('https://firestore.googleapis.com/v1/projects/linestar-web/databases/(default)/documents/featureStats?key=AIzaSyDLXoEhI18KV_-J3-PiBnHcNYfdv2IO5_c', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fields: {
                                d:          { stringValue: day },
                                id:         { stringValue: rnd },
                                view:       { stringValue: vals.view },
                                themePref:  { stringValue: vals.themePref },
                                theme:      { stringValue: vals.theme },
                                density:    { stringValue: vals.density },
                                chart:      { stringValue: vals.chart },
                                chartSize:  { stringValue: vals.chartSize },
                                colorblind: { stringValue: vals.colorblind },
                                sport:      { integerValue: String(parseInt(LineStar.Sport, 10) || 0) },
                                site:       { integerValue: String(parseInt(LineStar.Site, 10) || 0) },
                                premium:    { booleanValue: (LineStar.IsPremium == 1) },
                                mobile:     { booleanValue: !!vm.isMobileDevice },
                                // retention: Firestore's TTL policy on 'exp'
                                // auto-deletes raw snapshots after ~13 months
                                exp:        { timestampValue: new Date(Date.now() + 400 * 86400000).toISOString() }
                            }
                        })
                    }).then(function (r) {
                        // only mark sent on success so a blip retries tomorrow-
                        // at-the-latest (or on the next page load today)
                        if (r && r.ok) { try { localStorage.setItem('fscStatsD', day); } catch (e) { } }
                    })['catch'](function () { /* best-effort */ });
                } catch (e) { }
            }
            setTimeout(snap, 2500);
            document.addEventListener('fscconsent', function () { setTimeout(snap, 500); });
        }());
        // theme changes route through FSCTheme (not a page setter) - watch it;
        // onChange also fires for text-size changes, so diff the theme value
        if (window.FSCTheme && FSCTheme.onChange) {
            (function () {
                var lastThemePref = FSCTheme.getTheme();
                FSCTheme.onChange(function (st) {
                    if (st && st.theme !== lastThemePref) {
                        lastThemePref = st.theme;
                        window.fscTrack('fsc_setting_change', { fsc_setting: 'theme', fsc_value: st.theme });
                    }
                });
            }());
        }
        vm.onToggleColorblindMode = function () {
            vm.colorblindMode = (vm.colorblindMode == 1) ? 0 : 1;
            LineStarUtility.saveSettingInt('colorblindMode', vm.colorblindMode);
            document.body.classList.toggle('fscColorblind', vm.colorblindMode == 1);
            window.fscTrack('fsc_setting_change', { fsc_setting: 'colorblind', fsc_value: (vm.colorblindMode == 1) ? 'on' : 'off' });
            // matchup blocks/cards carry INLINE computed colors - re-render
            if (vm.refreshAllCharts) { vm.refreshAllCharts(); }
        };

        // scroll-driven toolbar collapse (vtAutoSlim desktop / vtAutoHide
        // mobile) - on by default, opt-out via Settings > Interface
        vm.autoSlimToolbar = LineStarUtility.loadSettingInt("autoSlimToolbar", 1);
        vm.onToggleAutoSlimToolbar = function () {
            vm.autoSlimToolbar = (vm.autoSlimToolbar == 1) ? 0 : 1;
            LineStarUtility.saveSettingInt('autoSlimToolbar', vm.autoSlimToolbar);
            // turning it off mid-scroll: restore the full toolbar right away
            if (vm.autoSlimToolbar != 1) { vm.resetVtAutoState(); }
        };
        
        vm.smallWindowCheck = function () {
            var k = "haveCheckedSmallWindow";
            vm.hasCheckedForSmallDevice = localStorage.getItem(k);
            if (vm.hasCheckedForSmallDevice != "1") {
                localStorage.setItem(k, "1");
                var h = $(window).height();
                if (h < 1000) {
                    LineStarUtility.saveSettingInt('hideGameViewOnScroll', 1);
                    vm.hideGameViewOnScroll = 1;
                }
            }
        };
        vm.onToggleHideGamesView = function () {
            if (vm.hideGameViewOnScroll == 1) {
                vm.hideGameViewOnScroll = 0;
                vm.showGameBar(true);
            } else {
                vm.hideGameViewOnScroll = 1;
            }
            LineStarUtility.saveSettingInt('hideGameViewOnScroll', vm.hideGameViewOnScroll);
        };

        vm.resizeTable = function () {
            var h = $(window).height();
            var ele = $('.fillPage__module');
            if (ele.length) {
                var rect = ele[0].getBoundingClientRect();
                var newHeight = h - rect.top;
                ele.height(newHeight);
            }
            ele = $('.projections__module');
            if (ele.length) {
                // EXACT remaining viewport, for every inline view. The CSS
                // fallback is calc(100dvh - var(--fsc-shell-top, 260px)) - an
                // estimate of the chrome above - and when it overshoots the page
                // gains a scrollbar and a strip of footer below the fold. This
                // measures the real distance instead.
                //
                // It has to be recomputed on every VIEW SWITCH, not just on
                // window resize: the toolbar rows above (.vtFilterRow, .vtScope)
                // are ng-show'd off for the lineups and stacks views, so rect.top
                // differs per view. A height measured for the table view is too
                // tall for stacks - which is exactly the leftover space and the
                // second scrollbar. See scheduleViewResize.
                var rect2 = ele[0].getBoundingClientRect();
                var newHeight2 = h - rect2.top;
                ele.height(newHeight2);
            }
        };
        vm.resizeTableDebounce = LineStarUtility.debounce(vm.resizeTable, 100);

        $(window).on('resize', function() {
            vm.resizeTable();
            // the teams flyout's clamp is measured from the anchor's position,
            // so it has to be recomputed whenever the viewport changes
            vm.sizeTeamsFlyout();
        });

        $(document).ready(function() {
            if (!LineStar.IsSignedIn) {
                var ticks = new Date().getTime();
                var lastTime = localStorage.getItem('lastautologinopen');
                var nowTicks = parseInt(lastTime);

                if (isNaN(nowTicks) || nowTicks > (ticks + 86400000)) {
                    setTimeout(function () {
                        $('#myModal_587').css('background-image', 'none');
                        //$('.LoginLink').click();
                        localStorage.setItem('lastautologinopen', ticks);
                    }, 1500);
                }
            }
            vm.resizeTable();
            vm.smallWindowCheck();

            // (A capture-phase document listener used to hijack .gameBox clicks
            // here and filter to the game's two teams directly, stopPropagation'ing
            // so the wrapper's ng-click never fired. That now blocks the wrapper's
            // game menu from opening at all, so it's gone - "Filter on both teams"
            // in that menu is the same action, routed through registerGameFilter.)
        });

        $(window).keydown(function (event) {
            if (event.keyCode == 13) {
                event.preventDefault();
                return false;
            }
        });

        vm.documentClick = function () {
            vm.hideAngularItemsOnClick();
            // any click that bubbles here is outside the Filters flyout
            // (the trigger and panel both stopPropagation), so close it
            if (vm.showFilterSortingDialog) { vm.showFilterSortingDialog = 0; }
            // likewise close the per-column filter popover (it stopPropagations its own clicks)
            if (vm.thFilter && vm.thFilter.show) { vm.thFilter.show = false; }
            // close the pinned optimizer-settings flyout pane (the gear stopPropagations its own clicks)
            if (vm.optSettingsOpen) { vm.optSettingsOpen = false; }
            if (vm.optModelsOpen) { vm.optModelsOpen = false; }
            if (vm.optStacksOpen) { vm.optStacksOpen = false; }
            if (vm.optStackOptionsOpen) { vm.optStackOptionsOpen = false; }
            if (vm.optStackTeamsOpen) { vm.optStackTeamsOpen = false; }
            if (vm.optExcludeTeamsOpen) { vm.optExcludeTeamsOpen = false; }
            if (vm.optPosStacksOpen) { vm.optPosStacksOpen = false; }
            vm.clearTeamsFlyoutSize();   // drop the measured clamp with the pane
        };

        // ---- app-shell height: publish the projections module's REAL top offset
        // as --fsc-shell-top so its height: calc(100dvh - var(...)) fills the
        // viewport exactly (the old hardcoded 260px guess left a white strip
        // below the module whenever the header + toolbar were shorter - e.g. the
        // collapsed mobile toolbar - and clipped rows when they were taller).
        var shellRafPending = false;
        vm.updateShellTop = function () {
            if (shellRafPending) { return; }
            shellRafPending = true;
            requestAnimationFrame(function () {
                shellRafPending = false;
                var mod = document.querySelector('.projections__module');
                if (!mod) { return; }
                var top = Math.max(0, Math.round(mod.getBoundingClientRect().top));
                document.documentElement.style.setProperty('--fsc-shell-top', top + 'px');
            });
        };
        window.addEventListener('resize', vm.updateShellTop);
        // the toolbar collapsing/expanding or wrapping moves the module's top;
        // observing the controller root's size catches all of those (the var
        // write re-triggers one observation, re-measures the same top, settles)
        if (typeof ResizeObserver !== 'undefined') {
            var shellObserver = new ResizeObserver(function () { vm.updateShellTop(); });
            var shellRoot = document.querySelector('.modules_all');
            if (shellRoot) { shellObserver.observe(shellRoot); }
        }
        vm.updateShellTop();

        // detachOnClick popups (alerts / SIC score) are position:fixed and don't
        // track their anchor - any scroll detaches them like a click does.
        // Capture-phase on window since scroll events don't bubble; scrolling
        // INSIDE the popup itself (the alerts list scrolls internally) is exempt.
        window.addEventListener('scroll', function (e) {
            var t = e.target;
            if (t && t.closest && t.closest('.detachOnClick')) { return; }
            $('.detachOnClick').detach();
        }, true);

        //
        $(document).on('click', function(event)
        {
            $('.detachOnClick').detach();

            vm.hidePopupElementsOnClick(false);

            var t = $(event.target);

            var id = t.attr('id');
            var parent = t.parent();
            //var parentId = (parent != null) ? parent.attr('id') : null;

            // "Filter" action on a matchupTableMini row -> open the range slider
            // for that specific matchup stat (md + column index)
            var fbtn = t.closest('.matchupTableMiniFilter');
            if (fbtn.length) {
                var fmid = fbtn.attr('data-mid');
                var fcol = parseInt(fbtn.attr('data-col'), 10);
                var flbl = fbtn.attr('data-label') || '';
                var frect = fbtn[0].getBoundingClientRect();
                $scope.$apply(function () { vm.openMatchupStatFilter(fmid, fcol, flbl, frect); });
                return false;
            }

            if (t.hasClass('matchupTableMiniName')) {
                var id = parent.parent().attr('data-mid');
                var col = t[0].innerText;

                for (var i = 0; i < vm.periodData.MatchupData.length; i++) {
                    var md = vm.periodData.MatchupData[i];
                    if (md.Id == id) {

                        var j = 0;
                        for (j = 0; j < md.Columns.length; j++) {
                            if (md.Columns[j] == col) {
                                break;
                            }
                        }

                        vm.sortMethod = -1;
                        md.SortCol = j;
                        vm.matchupDataSorterLast = md;

                        vm.onAdvancedSorterSelected(md, null);
                        //$scope.$digest();

                        break;
                    }
                }

                return false;
            }

            /*if(t.hasClass('chat__col') || t.hasClass('playerChatIcon')){
                var row = t.parents('tr');
                var sid = parseInt(row.attr('data-salaryid'));
                var ps = vm.SalaryDict[sid];

                createChatPopupForPlayer($('.chatmodal'), t, ps.PID, ps.Name, LineStar.PeriodId, LineStar.Sport, LineStar.Site, 'right');
                
                return;
			}*/
            if(t.hasClass('popoutClose')){
                t.parents('.popoutpanel').hide();
			}else if(t.hasClass('matchupTableName')){
        
			}else if(t.hasClass('customSliderRight')){
                var table =  $(".projections__module");
                var scrollLeft = table.scrollLeft();
                table.animate({scrollLeft:'+=1500'},500,function(){
                    
                });
			}else if(t.hasClass('customSliderLeft')){
                var table =  $(".projections__module");
                var scrollLeft = table.scrollLeft();
                table.animate({scrollLeft:'-=1500'},500,function(){
                    
                });
			}

            //
            if(t.is('th')){
                var sm = t.attr('attr-sort');
                if(sm != null && sm.length){
                    var inv = t.attr('attr-inverse');
                    if(inv != null && inv.length){
                        inv = parseInt(inv);      
					}else{
                        inv = 0;           
					}

                    sm = parseInt(sm);

                    if(vm.sortMethod == sm){
                        vm.sortDesc = vm.sortDesc ? 0 : 1;
					}else{
                        vm.sortDesc = inv ? 0 : 1;
					}

                    vm.sortMethod = sm;
                    vm.selectedSorter = vm.getSorterMethod(vm.sortMethod);
                    vm.saveSortMethod();
                    vm.filter_debounceShort();
				}
                return;
			}

            // matchup detail now shows as a hover flyout (fscMatchupTip), not a click popup
        });
});
mainLayoutApp.filter("filterSetsByUser", function () {
    return function (lineups, set, arg2) {
        var toShow = lineups;
        var tf = set.teamFilter;
        var pf = set.playerFilter;

        // team-stack filter
        if (tf != null && tf != undefined && tf > 0) {
            var teamShow = [];
            for (var i = 0; i < toShow.length; i++) {
                var l = toShow[i];
                for (var j = 0; j < l.TeamStack.length; j++) {
                    if (tf == l.TeamStack[j].TeamId) { teamShow.push(l); break; }
                }
            }
            toShow = teamShow;
        }

        // player filter: only lineups that contain this player
        if (pf != null && pf != undefined && pf > 0) {
            var playerShow = [];
            for (var i = 0; i < toShow.length; i++) {
                var l = toShow[i];
                var items = l.LineupItems || [];
                for (var j = 0; j < items.length; j++) {
                    if (items[j].Salary && items[j].Salary.PID == pf) { playerShow.push(l); break; }
                }
            }
            toShow = playerShow;
        }

        set.unfilteredCnt = toShow.length;

        return toShow;
    };
});
mainLayoutApp.filter("sanitize", ['$sce', function ($sce) {
        return function (htmlCode) {
            return $sce.trustAsHtml(htmlCode);
        }
    }]);

mainLayoutApp.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});
mainLayoutApp.filter('onRealId', function() {
  return function(items) {
    var newList = [];
    for(var i=0;i<items.length;i++){
        if(items[i].Id > 0){
            newList.push(items[i]);
		}
	}
    return newList;
  };
});
// reorders a player row's columns to the user's saved order at link time
// (post-link, so the row's ng-if cells already exist). Only does work when
// the order has been customized.
mainLayoutApp.directive("fscColOrder", [function () {
    return {
        restrict: "A",
        link: function ($scope) {
            // the row's ng-if cells aren't in the DOM yet at link, so defer a
            // single batched reorder of the header + all rows (see
            // scheduleColReorder) rather than reordering this row now.
            var m = $scope.m;
            if (m && m.colOrderCustomized && m.scheduleColReorder) {
                m.scheduleColReorder();
            }
        }
    };
}]);

// (fscRowExpand removed - whole-row click expansion was replaced by the
// per-row .rowExpandBtn chevron in the pos column; see m.toggleRowExpand.)

// drag-to-reorder for the Settings column list. Items carry data-colkey and
// draggable="true"; dropping one onto another moves it before that column.
mainLayoutApp.directive("fscColSortable", [function () {
    return {
        restrict: "A",
        link: function ($scope, $element) {
            var el = $element[0];
            var dragKey = null;
            var itemFor = function (node) { return node && node.closest ? node.closest('[data-colkey]') : null; };
            var clearDrop = function () {
                var marked = el.querySelectorAll('.psColDropBefore, .psColDropAfter');
                for (var i = 0; i < marked.length; i++) { marked[i].classList.remove('psColDropBefore', 'psColDropAfter'); }
            };
            // is the cursor in the bottom half of the item (drop after) vs top (before)?
            var isAfter = function (item, y) {
                var r = item.getBoundingClientRect();
                return y > r.top + r.height / 2;
            };
            el.addEventListener('dragstart', function (e) {
                var item = itemFor(e.target);
                if (!item) { return; }
                dragKey = item.getAttribute('data-colkey');
                if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragKey); } catch (_) { } }
                item.classList.add('psColDragging');
            });
            el.addEventListener('dragend', function (e) {
                var item = itemFor(e.target);
                if (item) { item.classList.remove('psColDragging'); }
                clearDrop();
                dragKey = null;
            });
            el.addEventListener('dragover', function (e) {
                e.preventDefault();
                if (e.dataTransfer) { e.dataTransfer.dropEffect = 'move'; }
                clearDrop();
                var item = itemFor(e.target);
                if (!item || dragKey == null || item.getAttribute('data-colkey') === dragKey) { return; }
                item.classList.add(isAfter(item, e.clientY) ? 'psColDropAfter' : 'psColDropBefore');
            });
            el.addEventListener('dragleave', function (e) {
                // only clear when actually leaving the list (not crossing items)
                if (!el.contains(e.relatedTarget)) { clearDrop(); }
            });
            el.addEventListener('drop', function (e) {
                e.preventDefault();
                var item = itemFor(e.target);
                clearDrop();
                if (!item || dragKey == null) { return; }
                var targetKey = item.getAttribute('data-colkey');
                if (targetKey === dragKey) { return; }
                var dk = dragKey;
                var after = isAfter(item, e.clientY);
                $scope.$apply(function () { $scope.m.moveColumn(dk, targetKey, after); });
            });
        }
    };
}]);

// drag-to-reorder the actual salData column headers. Columns run
// horizontally, so before/after is decided by the cursor's X within the
// hovered th; a vertical blue line marks the insertion point. A plain
// click still sorts (drag and click are mutually exclusive); dragging
// from the hide-X is suppressed.
mainLayoutApp.directive("fscColHeadSortable", [function () {
    return {
        restrict: "A",
        link: function ($scope, $element) {
            var el = $element[0];  // the header row (thead > tr)
            var dragKey = null;
            var thFor = function (node) { return node && node.closest ? node.closest('th[attr-col]') : null; };
            var setDraggable = function () {
                var ths = el.querySelectorAll('th[attr-col]');
                for (var i = 0; i < ths.length; i++) {
                    if (ths[i].getAttribute('draggable') !== 'true') { ths[i].setAttribute('draggable', 'true'); }
                }
            };
            setDraggable();
            // ng-if adds/removes header cells when the slate or sport changes
            var mo = null;
            if (window.MutationObserver) {
                mo = new MutationObserver(setDraggable);
                mo.observe(el, { childList: true });
                $scope.$on('$destroy', function () { mo.disconnect(); });
            }
            var colMid = null;                  // cached column midpoints (X) for the active drag
            var markedTh = null, markedSide = null;
            var clearDrop = function () {
                if (markedTh) { markedTh.classList.remove('thDropBefore', 'thDropAfter'); }
                markedTh = null; markedSide = null;
            };
            // snapshot the header midpoints once per drag. Columns don't move
            // until drop, so this avoids getBoundingClientRect() (a full-table
            // reflow) on every dragover, which is what made the drag laggy.
            var snapshotMids = function () {
                colMid = {};
                var ths = el.querySelectorAll('th[attr-col]');
                for (var i = 0; i < ths.length; i++) {
                    var r = ths[i].getBoundingClientRect();
                    colMid[ths[i].getAttribute('attr-col')] = r.left + r.width / 2;
                }
            };
            var afterOf = function (th, x) {
                var key = th.getAttribute('attr-col');
                if (colMid && colMid[key] != null) { return x > colMid[key]; }
                var r = th.getBoundingClientRect();
                return x > r.left + r.width / 2;
            };
            el.addEventListener('dragstart', function (e) {
                // dragging from the hide-X shouldn't start a column drag
                if (e.target && e.target.closest && e.target.closest('.thHideBtn')) { e.preventDefault(); return; }
                var th = thFor(e.target);
                if (!th) { return; }
                dragKey = th.getAttribute('attr-col');
                snapshotMids();
                if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragKey); } catch (_) { } }
                th.classList.add('thDragging');
            });
            el.addEventListener('dragend', function (e) {
                var th = thFor(e.target);
                if (th) { th.classList.remove('thDragging'); }
                clearDrop();
                colMid = null;
                dragKey = null;
            });
            el.addEventListener('dragover', function (e) {
                if (dragKey == null) { return; }
                e.preventDefault();
                if (e.dataTransfer) { e.dataTransfer.dropEffect = 'move'; }
                var th = thFor(e.target);
                if (!th || th.getAttribute('attr-col') === dragKey) { clearDrop(); return; }
                var after = afterOf(th, e.clientX);
                // only touch the DOM when the indicator actually changes
                if (th === markedTh && after === markedSide) { return; }
                clearDrop();
                markedTh = th; markedSide = after;
                th.classList.add(after ? 'thDropAfter' : 'thDropBefore');
            });
            el.addEventListener('drop', function (e) {
                if (dragKey == null) { return; }
                e.preventDefault();
                var th = thFor(e.target);
                clearDrop();
                if (!th) { dragKey = null; return; }
                var targetKey = th.getAttribute('attr-col');
                if (targetKey === dragKey) { dragKey = null; return; }
                var after = afterOf(th, e.clientX);
                var dk = dragKey;
                dragKey = null;
                $scope.$apply(function () { $scope.m.moveColumn(dk, targetKey, after); });
            });
        }
    };
}]);

// Column-header tooltips, rendered into <body> with position:fixed. The
// salData table sits in a scroll container that clips overflow, so a CSS
// ::before tooltip on the header gets cut off above the row. This floats
// free of any clipping ancestor and flips below the header if there's no
// room above.
mainLayoutApp.directive("fscThTips", [function () {
    return {
        restrict: "A",
        link: function ($scope, $element) {
            var el = $element[0];          // the header row (thead > tr)
            var tip = null, curTh = null;
            var ensureTip = function () {
                if (tip) { return tip; }
                tip = document.createElement('div');
                tip.className = 'fscThTip';
                document.body.appendChild(tip);
                return tip;
            };
            var hide = function () {
                if (tip) { tip.classList.remove('isOn'); tip.style.display = 'none'; }
                curTh = null;
            };
            var place = function (th) {
                var txt = th.getAttribute('data-tool-tip') || '';
                if (!txt) { hide(); return; }
                var t = ensureTip();
                t.textContent = txt;
                t.style.left = '-9999px';   // park off-screen to measure
                t.style.top = '0px';
                t.style.display = 'block';
                var r = th.getBoundingClientRect();
                var tw = t.offsetWidth, ht = t.offsetHeight, pad = 6;
                var left = r.left + (r.width - tw) / 2;
                left = Math.max(pad, Math.min(left, window.innerWidth - pad - tw));
                var top = r.top - ht - 8;
                if (top < pad) { top = r.bottom + 8; }   // flip below if no room above
                t.style.left = left + 'px';
                t.style.top = top + 'px';
                t.classList.add('isOn');
            };
            el.addEventListener('mouseover', function (e) {
                var th = e.target && e.target.closest ? e.target.closest('th[data-tool-tip]') : null;
                if (!th || !el.contains(th) || th === curTh) { return; }
                curTh = th;
                place(th);
            });
            el.addEventListener('mouseout', function (e) {
                if (!curTh) { return; }
                var to = e.relatedTarget;   // keep it up while moving between header cells
                if (to && to.closest && el.contains(to) && to.closest('th[data-tool-tip]')) { return; }
                hide();
            });
            // a fixed tooltip can't track a scrolling/dragging header - just hide
            var onHide = function () { hide(); };
            window.addEventListener('scroll', onHide, true);
            el.addEventListener('dragstart', onHide);
            $scope.$on('$destroy', function () {
                window.removeEventListener('scroll', onHide, true);
                if (tip && tip.parentNode) { tip.parentNode.removeChild(tip); }
                tip = null;
            });
        }
    };
}]);

// Flyout panel for the "Range" column. Reads the floor/ceil/cons/proj from the
// hovered bar's data-attrs and renders a styled card into <body> (position:fixed
// so the table's scroll container can't clip it). Prefers to sit to the right of
// the bar and flips left / clamps to the viewport when there's no room.
mainLayoutApp.directive("fscRangeTip", [function () {
    return {
        restrict: "A",
        link: function ($scope, $element) {
            var el = $element[0];          // the salData table
            var tip = null, curBar = null;
            var fmt = function (v) { var n = parseFloat(v); return isFinite(n) ? n.toFixed(1) : '-'; };
            var ensureTip = function () {
                if (tip) { return tip; }
                tip = document.createElement('div');
                tip.className = 'rangeTip';
                document.body.appendChild(tip);
                return tip;
            };
            var hide = function () {
                if (tip) { tip.classList.remove('isOn'); tip.style.display = 'none'; }
                curBar = null;
            };
            var build = function (bar) {
                var floor = parseFloat(bar.getAttribute('data-floor'));
                var ceil = parseFloat(bar.getAttribute('data-ceil'));
                var cons = parseFloat(bar.getAttribute('data-cons'));
                var proj = parseFloat(bar.getAttribute('data-proj'));
                var deltaHtml = '';
                if (isFinite(proj) && isFinite(cons)) {
                    var d = proj - cons, up = d >= 0;
                    deltaHtml = '<span class="rangeTipDelta ' + (up ? 'rangeTipUp' : 'rangeTipDown') + '">' + (up ? '+' : '') + d.toFixed(1) + ' vs cons</span>';
                }
                /* consensus value takes the bar's proj<->cons segment color
                   (red = cons below your proj, green = cons above) */
                var consCol = (isFinite(proj) && isFinite(cons) && cons !== proj)
                    ? (cons < proj ? 'var(--range-loss, #e05a5a)' : 'var(--range-gain, #2fbf7f)')
                    : '';
                /* points scored - present once the game is underway (the
                   builder only writes data-scored then). Label + swatch
                   follow the gameBox status language: Live green, Final blue */
                var scoredVal = parseFloat(bar.getAttribute('data-scored'));
                var scoredFinal = (bar.getAttribute('data-scorestate') === 'final');
                var scoredHtml = isFinite(scoredVal)
                    ? '<div class="rangeTipRow"><span class="rangeTipSw rangeTipSwScored ' + (scoredFinal ? 'rangeTipSwFinal' : 'rangeTipSwLive') + '"></span><span class="rangeTipKey">' + (scoredFinal ? 'Final' : 'Live') + '</span><span class="rangeTipVal">' + fmt(scoredVal) + '</span></div>'
                    : '';
                // no consensus on this slate (data-cons empty -> NaN): the
                // Consensus row is omitted entirely
                var consHtml = isFinite(cons)
                    ? '<div class="rangeTipRow"><span class="rangeTipSw rangeTipSwCons"></span><span class="rangeTipKey">Consensus</span><span class="rangeTipVal"' + (consCol ? ' style="color:' + consCol + '"' : '') + '>' + fmt(cons) + '</span></div>'
                    : '';
                return '' +
                    '<div class="rangeTipHead">Projection Range</div>' +
                    '<div class="rangeTipRow"><span class="rangeTipSw rangeTipSwProj"></span><span class="rangeTipKey">Your Proj</span><span class="rangeTipVal">' + fmt(proj) + '</span>' + deltaHtml + '</div>' +
                    scoredHtml +
                    consHtml +
                    '<div class="rangeTipRow"><span class="rangeTipSw rangeTipSwBand"></span><span class="rangeTipKey">Ceiling</span><span class="rangeTipVal">' + fmt(ceil) + '</span></div>' +
                    '<div class="rangeTipRow"><span class="rangeTipSw rangeTipSwBand"></span><span class="rangeTipKey">Floor</span><span class="rangeTipVal">' + fmt(floor) + '</span></div>';
            };
            var place = function (bar) {
                var t = ensureTip();
                t.innerHTML = build(bar);
                t.style.left = '-9999px'; t.style.top = '0px'; t.style.display = 'block';
                var r = bar.getBoundingClientRect();
                var tw = t.offsetWidth, th = t.offsetHeight, pad = 8, gap = 10;
                var left = r.right + gap;                                  // prefer right of the bar
                if (left + tw > window.innerWidth - pad) { left = r.left - gap - tw; }   // flip left
                if (left < pad) { left = pad; }
                var top = r.top + (r.height - th) / 2;                     // vertically centered on the bar
                if (top < pad) { top = pad; }
                if (top + th > window.innerHeight - pad) { top = window.innerHeight - pad - th; }
                t.style.left = left + 'px';
                t.style.top = top + 'px';
                t.classList.add('isOn');
            };
            el.addEventListener('mouseover', function (e) {
                var bar = e.target && e.target.closest ? e.target.closest('.rangeBar') : null;
                if (!bar || !el.contains(bar) || bar === curBar) { return; }
                curBar = bar;
                place(bar);
            });
            el.addEventListener('mouseout', function (e) {
                if (!curBar) { return; }
                var to = e.relatedTarget;
                if (to && to.closest && el.contains(to) && to.closest('.rangeBar') === curBar) { return; }
                hide();
            });
            var onHide = function () { hide(); };
            window.addEventListener('scroll', onHide, true);
            $scope.$on('$destroy', function () {
                window.removeEventListener('scroll', onHide, true);
                if (tip && tip.parentNode) { tip.parentNode.removeChild(tip); }
                tip = null;
            });
        }
    };
}]);

// Interactive flyout menu for column headers (richer alternative to fscThTips).
// Shows the column's tooltip at top, sort asc/desc (with the default marked and
// the active one checked), Hide column, open Column settings, and a reorder hint.
// Rendered into <body> (position:fixed) so the table's scroll container can't
// clip it; pointer-events are live with a hover-grace so you can move into it.
// ROLLBACK: swap the header row's `fsc-th-menu` attribute back to `fsc-th-tips`.
mainLayoutApp.directive("fscThMenu", [function () {
    return {
        restrict: "A",
        link: function ($scope, $element) {
            var el = $element[0];          // the header row (thead > tr)
            var panel = null, curTh = null, curKey = null, curSm = null, hideTimer = null, showTimer = null;
            var SHOW_DELAY = 250;          // hover-intent: wait before opening on a fresh hover
            var thFor = function (n) { return n && n.closest ? n.closest('th[attr-col]') : null; };
            var esc = function (s) {
                return (s == null ? '' : ('' + s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            };
            var labelOf = function (th) {
                var txt = (th.textContent || '').replace(/[+×]/g, '').trim();
                return txt || th.getAttribute('attr-col');
            };
            function cancelHide() { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } }
            function cancelShow() { if (showTimer) { clearTimeout(showTimer); showTimer = null; } }
            function hide() { cancelHide(); cancelShow(); if (panel) { panel.classList.remove('isOn'); panel.style.display = 'none'; } curTh = null; }
            function scheduleHide() { cancelHide(); hideTimer = setTimeout(hide, 160); }
            function scheduleShow(th) { cancelShow(); showTimer = setTimeout(function () { showTimer = null; showFor(th); }, SHOW_DELAY); }
            var applySort = function (m, method, desc) {
                m.sortMethod = method;
                m.sortDesc = desc;
                if (m.getSorterMethod) { m.selectedSorter = m.getSorterMethod(method); }
                if (m.saveSortMethod) { m.saveSortMethod(); }
                if (m.filter_debounceShort) { m.filter_debounceShort(); }
            };
            var ensure = function () {
                if (panel) { return panel; }
                panel = document.createElement('div');
                panel.className = 'thMenu';
                document.body.appendChild(panel);
                panel.addEventListener('mouseenter', cancelHide);
                panel.addEventListener('mouseleave', scheduleHide);
                panel.addEventListener('click', function (e) {
                    var btn = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
                    if (!btn) { return; }
                    e.stopPropagation();
                    var act = btn.getAttribute('data-act');
                    var m = $scope.m;
                    $scope.$apply(function () {
                        if (act === 'sort-desc' && curSm != null) { applySort(m, curSm, 1); }
                        else if (act === 'sort-asc' && curSm != null) { applySort(m, curSm, 0); }
                        else if (act === 'hide') { m.hideCol(curKey); }
                        else if (act === 'filter' && curSm != null && m.openColumnFilter) { m.openColumnFilter(curKey, curSm, labelOf(curTh), curTh.getBoundingClientRect()); }
                        else if (act === 'settings') { m.showPopupSettingsPanel = 1; m.settingsTab = 3; if (m.buildColumnList) { m.buildColumnList(); } }
                    });
                    hide();
                });
                return panel;
            };
            var sortItem = function (dir, label, isDefault, isActive) {
                var act = dir === 'desc' ? 'sort-desc' : 'sort-asc';
                var glyph = dir === 'desc' ? '↓' : '↑';
                var badge = isDefault ? '<span class="thMenuBadge">default</span>' : '';
                var check = isActive ? '<span class="thMenuCheck">✓</span>' : '';
                return '<button type="button" class="thMenuItem' + (isActive ? ' thMenuItemActive' : '') + '" data-act="' + act + '">'
                    + '<span class="thMenuIco">' + glyph + '</span><span class="thMenuLbl">' + label + '</span>' + badge + check + '</button>';
            };
            var build = function (th) {
                var tip = th.getAttribute('data-tool-tip') || '';
                var sm = th.getAttribute('attr-sort');
                var sortable = sm != null && sm.length > 0;
                var inv = parseInt(th.getAttribute('attr-inverse') || '0', 10) ? 1 : 0;  // inv => default ascending
                var m = $scope.m;
                var active = sortable && m && ('' + m.sortMethod) === ('' + sm);
                var curDesc = (m && m.sortDesc) ? 1 : 0;
                var html = '<div class="thMenuHead">' + esc(labelOf(th)) + '</div>';
                if (tip) { html += '<div class="thMenuTip">' + esc(tip) + '</div>'; }
                html += '<div class="thMenuSep"></div>';
                if (sortable) {
                    var descIsDefault = inv ? false : true;
                    html += sortItem('desc', 'Sort high → low', descIsDefault, active && curDesc === 1);
                    html += sortItem('asc', 'Sort low → high', !descIsDefault, active && curDesc === 0);
                    var isFilt = m && m.isColFiltered && m.isColFiltered(th.getAttribute('attr-col'));
                    html += '<button type="button" class="thMenuItem' + (isFilt ? ' thMenuItemActive' : '') + '" data-act="filter">'
                        + '<span class="thMenuIco"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 .78 1.63L15 14.2V19a1 1 0 0 1-1.45.9l-3-1.5A1 1 0 0 1 10 17.5v-3.3L3.22 6.63A1 1 0 0 1 4 5z"/></svg></span>'
                        + '<span class="thMenuLbl">Filter range…</span>' + (isFilt ? '<span class="thMenuCheck">✓</span>' : '') + '</button>';
                } else {
                    html += '<div class="thMenuItem thMenuItemMuted"><span class="thMenuIco">—</span><span class="thMenuLbl">Not sortable</span></div>';
                }
                html += '<button type="button" class="thMenuItem" data-act="hide"><span class="thMenuIco">⊘</span><span class="thMenuLbl">Hide column</span></button>';
                html += '<button type="button" class="thMenuItem" data-act="settings"><span class="thMenuIco">⚙</span><span class="thMenuLbl">Column settings…</span></button>';
                html += '<div class="thMenuSep"></div>';
                html += '<div class="thMenuHint">Drag a header to reorder columns</div>';
                return html;
            };
            var position = function (th) {
                panel.style.left = '-9999px'; panel.style.top = '0px'; panel.style.display = 'block';
                var r = th.getBoundingClientRect();
                var pw = panel.offsetWidth, ph = panel.offsetHeight, pad = 8;
                var left = r.left;
                if (left + pw > window.innerWidth - pad) { left = window.innerWidth - pad - pw; }
                if (left < pad) { left = pad; }
                var top = r.bottom + 2;
                if (top + ph > window.innerHeight - pad) {
                    var above = r.top - 2 - ph;
                    if (above > pad) { top = above; }
                }
                panel.style.left = left + 'px';
                panel.style.top = top + 'px';
                panel.classList.add('isOn');
            };
            var showFor = function (th) {
                ensure();
                curTh = th;
                curKey = th.getAttribute('attr-col');
                var sm = th.getAttribute('attr-sort');
                curSm = (sm != null && sm.length > 0) ? parseInt(sm, 10) : null;
                panel.innerHTML = build(th);
                position(th);
            };
            el.addEventListener('mouseover', function (e) {
                var th = thFor(e.target);
                if (!th || !el.contains(th)) { return; }
                cancelHide();
                if (th === curTh && panel && panel.style.display === 'block') { return; }
                // first open waits out the hover-intent delay; once a menu is
                // already open, switching to another header is instant.
                if (panel && panel.classList.contains('isOn')) { cancelShow(); showFor(th); }
                else { scheduleShow(th); }
            });
            el.addEventListener('mouseout', function (e) {
                var to = e.relatedTarget;
                if (to && to.closest) {
                    if (panel && (to === panel || panel.contains(to))) { return; }   // moving into the panel
                    var toTh = to.closest('th[attr-col]');
                    if (toTh && el.contains(toTh)) { return; }                       // moving to another header
                }
                cancelShow();   // bail on a pending open if the cursor left before the delay
                scheduleHide();
            });
            var onHide = function () { hide(); };
            window.addEventListener('scroll', onHide, true);
            el.addEventListener('dragstart', onHide);
            $scope.$on('$destroy', function () {
                window.removeEventListener('scroll', onHide, true);
                cancelHide();
                cancelShow();
                if (panel && panel.parentNode) { panel.parentNode.removeChild(panel); }
                panel = null;
            });
        }
    };
}]);

// Matchup detail flyout: hovering a matchup block (.matchupEle) shows its
// per-column rank/value breakdown in a panel rendered into <body> (position:
// fixed, pointer-events:none) so it can't be clipped or flicker under the
// table tooltips/cells like the old in-cell click popup did.
mainLayoutApp.directive("fscMatchupTip", [function () {
    return {
        restrict: "A",
        link: function ($scope, $element) {
            var el = $element[0];          // the salData table
            var tip = null, curEle = null, closeTimer = null, openedAt = 0, closedAt = 0;
            var cancelClose = function () { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } };
            var hide = function () {
                cancelClose();
                if (tip) { tip.classList.remove('isOn'); tip.style.display = 'none'; }
                curEle = null;
                closedAt = Date.now();   // ghost-click window - see the el click handler
            };
            // close after a short grace period so the pointer can travel from the
            // block down into the flyout (to tap a stat) without it vanishing
            var scheduleClose = function () { cancelClose(); closeTimer = setTimeout(hide, 220); };
            var ensure = function () {
                if (tip) { return tip; }
                tip = document.createElement('div');
                tip.className = 'matchupTip';
                document.body.appendChild(tip);
                tip.addEventListener('mouseenter', cancelClose);
                tip.addEventListener('mouseleave', scheduleClose);
                // tapping a stat sorts by it (handled by the document .matchupTableMiniName
                // click handler, which this bubbles to); close the flyout afterwards
                tip.addEventListener('click', function (e) {
                    if (e.target && e.target.closest && e.target.closest('.matchupTipClose')) { hide(); return; }
                    if (e.target && e.target.closest && (e.target.closest('.matchupTableMiniName') || e.target.closest('.matchupTableMiniFilter'))) {
                        setTimeout(hide, 0);
                    }
                });
                // the X closes on touchend with preventDefault: letting the tap
                // synthesize a click means the click is hit-tested AFTER the
                // sheet hides and can land on a matchup block behind it,
                // instantly reopening the tip (the click listener above still
                // serves mouse users)
                tip.addEventListener('touchend', function (e) {
                    if (!(e.target && e.target.closest && e.target.closest('.matchupTipClose'))) { return; }
                    e.preventDefault();
                    e.stopPropagation();
                    hide();
                }, { passive: false });
                // drag-to-close for the mobile sheet: a touch-drag starting in
                // the card's top strip follows the finger; releasing past 80px
                // dismisses, anything less springs back. Listeners live on the
                // persistent tip - place() rebuilds the card via innerHTML on
                // every open, so never bind to the card itself.
                var dragY = null, dragDy = 0, dragCard = null;
                tip.addEventListener('touchstart', function (e) {
                    if (window.innerWidth > 800) { return; }
                    var card = e.target && e.target.closest ? e.target.closest('.matchupTableMini') : null;
                    if (!card) { return; }
                    // whole header band (handle + title + X) drags, not just
                    // the 4px handle bar
                    if (e.touches[0].clientY - card.getBoundingClientRect().top > 64) { return; }
                    dragCard = card;
                    dragY = e.touches[0].clientY;
                    dragDy = 0;
                    card.style.transition = 'none';
                    card.style.animation = 'none';
                }, { passive: true });
                tip.addEventListener('touchmove', function (e) {
                    if (dragY == null || !dragCard) { return; }
                    dragDy = Math.max(0, e.touches[0].clientY - dragY);
                    dragCard.style.transform = 'translateY(' + dragDy + 'px)';
                    e.preventDefault();   // the pull must not scroll the card
                }, { passive: false });
                var endDrag = function () {
                    if (dragY == null) { return; }
                    dragY = null;
                    if (dragCard) {
                        dragCard.style.transition = '';
                        dragCard.style.animation = '';
                        dragCard.style.transform = '';
                        dragCard = null;
                    }
                    if (dragDy > 80) { hide(); }
                };
                tip.addEventListener('touchend', endDrag);
                tip.addEventListener('touchcancel', endDrag);
                return tip;
            };
            var buildHtml = function (ele) {
                var m = $scope.m;
                if (!m || !m.periodData) { return ''; }
                var mid = ele.getAttribute('data-mid');
                var sid = parseInt(ele.getAttribute('data-sid'), 10);
                var pmd = m.periodData.MatchupData, md = null, item = null;
                for (var i = 0; i < pmd.length; i++) {
                    if (pmd[i].Id == mid) {
                        md = pmd[i];
                        var sal = m.SalaryDict[sid];
                        // some sports' matchup items carry a SID that isn't a
                        // listed salary id (variant ids - NASCAR hit this and
                        // the tip silently never showed): fall back to the
                        // hovered block's own row/card, which always stamps
                        // the real salary id
                        if (!sal && ele.closest) {
                            var host = ele.closest('[data-salaryid]');
                            if (host) { sal = m.SalaryDict[parseInt(host.getAttribute('data-salaryid'), 10)]; }
                        }
                        item = (sal && sal.MatchupData) ? sal.MatchupData[i] : null;
                        break;
                    }
                }
                if (!md || !item) { return ''; }
                // mirror the matchupTableMini card (incl. tap-to-sort) from the expanded
                // player row; wrapping in .playerMatchupArea reuses all of its styling
                var sorted = (m.matchupDataSorter == md);
                var cardCls = sorted ? 'matchupTableMini matchupTableMiniSel' : 'matchupTableMini';
                var safeName = String(md.Name).replace(/"/g, '&quot;');
                var html = '<div class="playerMatchupArea matchupTipArea">';
                html += '<div class="' + cardCls + '" data-mid="' + md.Id + '" data-sid="' + sid + '">';
                html += '<div class="matchupTableMiniTitle"><span class="matchupTableMiniTitleText" title="' + safeName + '">' + md.Name + '</span></div>';
                // mobile-sheet close (CSS hides it on desktop, where hover-out closes)
                html += '<span class="matchupTipClose" role="button" tabindex="0" aria-label="Close">&times;</span>';
                html += '<div class="matchupTipNote">Tap any stat to sort by that stat...</div>';
                for (var c = 0; c < md.Columns.length; c++) {
                    var rowCls = (sorted && c == m.matchupDataSorterColIdx) ? 'matchupTableMiniRow matchupTableMiniRowSel' : 'matchupTableMiniRow';
                    var fOn = m.colFilters['mu:' + md.Id + ':' + c] ? ' isOn' : '';
                    var fLbl = (md.Name + ': ' + md.Columns[c]).replace(/"/g, '&quot;');
                    html += '<div class="' + rowCls + '"><div class="matchupTableMiniName">' + md.Columns[c] + '</div><div class="matchupTableMiniValue matchupRank' + item.Ranks[c] + '">' + item.Values[c] + '</div><span class="matchupTableMiniFilter' + fOn + '" data-mid="' + md.Id + '" data-col="' + c + '" data-label="' + fLbl + '" title="Filter by ' + fLbl + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4-2v-4z"/></svg></span></div>';
                }
                html += '</div></div>';
                return html;
            };
            var place = function (ele) {
                var html = buildHtml(ele);
                if (!html) { hide(); return; }
                var t = ensure();
                t.innerHTML = html;
                // mobile: no anchoring - the fscSheet-style CSS pins the tip to
                // the bottom edge as a sheet (display none->block re-runs the
                // slide-up animation on every open)
                if (window.innerWidth <= 800) {
                    t.style.left = ''; t.style.top = ''; t.style.display = 'block';
                    t.classList.add('isOn');
                    openedAt = Date.now();
                    return;
                }
                t.style.left = '-9999px'; t.style.top = '0px'; t.style.display = 'block';
                var r = ele.getBoundingClientRect();
                var tw = t.offsetWidth, th = t.offsetHeight, pad = 8, gap = 8;
                var left = r.left + r.width / 2 - tw / 2;          // centered under the block
                left = Math.max(pad, Math.min(left, window.innerWidth - pad - tw));
                var top = r.bottom + gap;                          // below the block...
                if (top + th > window.innerHeight - pad) {         // ...flip above if no room
                    var above = r.top - th - gap;
                    if (above > pad) { top = above; }
                }
                t.style.left = left + 'px';
                t.style.top = top + 'px';
                t.classList.add('isOn');
                openedAt = Date.now();
            };
            el.addEventListener('mouseover', function (e) {
                // mobile sheet mode: never hover-open. Taps open via the click
                // handler; worse, hiding the sheet makes the browser re-hit-test
                // the last tap point and fire a synthetic mouseover on whatever
                // block it exposes - which reopened the sheet right after the
                // X closed it.
                if (window.innerWidth <= 800) { return; }
                var ele = e.target && e.target.closest ? e.target.closest('.matchupEle') : null;
                if (!ele || !el.contains(ele)) { return; }
                cancelClose();
                if (ele === curEle) { return; }
                curEle = ele;
                place(ele);
            });
            el.addEventListener('mouseout', function (e) {
                if (window.innerWidth <= 800) { return; }   // sheet mode: no hover-close either
                if (!curEle) { return; }
                var to = e.relatedTarget;
                if (to && to.closest && el.contains(to) && to.closest('.matchupEle') === curEle) { return; }
                scheduleClose();
            });
            // Clicking a block OPENS the detail flyout (it used to sort by the
            // category's default column) - on touch there's no hover, so this is
            // the only way to reach the flyout; sorting happens from the flyout's
            // stat rows ("tap any stat to sort"). A second deliberate click on
            // the same block closes it - the openedAt window ignores the click
            // that immediately follows the synthetic mouseover a tap fires.
            el.addEventListener('click', function (e) {
                // ghost-click guard: a tap that just closed the sheet must not
                // reopen it - the tap's trailing click retargets to whatever
                // block the hide exposed underneath
                if (Date.now() - closedAt < 350) { return; }
                var ele = e.target && e.target.closest ? e.target.closest('.matchupEle') : null;
                if (!ele || !el.contains(ele)) { return; }
                cancelClose();
                if (ele === curEle && tip && tip.classList.contains('isOn')) {
                    if (Date.now() - openedAt > 500) { hide(); }
                    return;
                }
                curEle = ele;
                place(ele);
            });
            // touch has no mouseout: a tap anywhere outside the flyout (and
            // outside the blocks) dismisses it. Capture phase so inner
            // stopPropagation handlers can't strand an open flyout.
            var onDocClick = function (e) {
                if (!curEle) { return; }
                var t = e.target;
                if (t && t.closest) {
                    var inTip = t.closest('.matchupTip');
                    // a click on the tip ELEMENT itself (not a child) is the
                    // mobile sheet's scrim (its ::before backdrop targets the
                    // element) - treat it as an outside tap and dismiss
                    if (inTip && t !== inTip) { return; }
                    if (!inTip && el.contains(t) && t.closest('.matchupEle')) { return; }
                }
                hide();
            };
            document.addEventListener('click', onDocClick, true);
            // scrolls INSIDE the tip (the mobile sheet scrolls its stats) must
            // not dismiss it - only outside/page scrolling hides
            var onHide = function (e) {
                if (e && e.target && tip && (e.target === tip || (tip.contains && tip.contains(e.target)))) { return; }
                hide();
            };
            window.addEventListener('scroll', onHide, true);
            el.addEventListener('dragstart', onHide);
            $scope.$on('$destroy', function () {
                window.removeEventListener('scroll', onHide, true);
                document.removeEventListener('click', onDocClick, true);
                if (tip && tip.parentNode) { tip.parentNode.removeChild(tip); }
                tip = null;
            });
        }
    };
}]);

// Generic hover-open with a close delay. Adds .is-open on mouseenter and keeps
// it for ~300ms after the pointer leaves the element (and ALL its descendants,
// including absolutely-positioned overlay children) so brief mouse drift doesn't
// drop it - CSS :hover closes instantly with no grace. Re-entering cancels the
// pending close. Used by the inline header position-filter's expanding bar.
mainLayoutApp.directive("fscHoverOpen", [function () {
    return {
        restrict: "A",
        link: function ($scope, $element) {
            var el = $element[0];
            var timer = null;
            el.addEventListener('mouseenter', function () {
                if (timer) { clearTimeout(timer); timer = null; }
                el.classList.add('is-open');
            });
            el.addEventListener('mouseleave', function () {
                if (timer) { clearTimeout(timer); }
                timer = setTimeout(function () { el.classList.remove('is-open'); timer = null; }, 300);
            });
            $scope.$on('$destroy', function () { if (timer) { clearTimeout(timer); } });
        }
    };
}]);

// Shared drag-to-close for SCOPE-DRIVEN mobile bottom sheets: attach to the
// sheet element with an assignable expression (fsc-sheet-drag="m.someFlag");
// a touch-drag starting in the element's top strip (the drag-handle area)
// follows the finger, and releasing past 80px sets the flag to 0. The
// class-driven sheets (optimizer via fscTapOpen, matchup tip) wire their own
// because their close is a DOM class, not scope.
mainLayoutApp.directive('fscSheetDrag', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function ($scope, $element, attrs) {
            var el = $element[0];
            var setter = $parse(attrs.fscSheetDrag).assign;
            if (!setter) { return; }
            var dragY = null, dragDy = 0;
            el.addEventListener('touchstart', function (e) {
                if (window.innerWidth > 800) { return; }
                // only engage while the element is actually presenting as a
                // fixed sheet: the toolbar hosts this directive but is a
                // collapsed 0-height strip until vtSheetMode - engaging then
                // puts a transform on it, which re-anchors the FIXED optimizer
                // sheet nested inside it (= the sheet vanished mid-touch)
                if (getComputedStyle(el).position !== 'fixed') { return; }
                // touches inside a nested sheet (the optimizer flyout lives
                // INSIDE the toolbar) belong to that sheet, not this one
                if (e.target && e.target.closest && e.target.closest('.lbMiniFlyout')) { return; }
                var rect = el.getBoundingClientRect();
                // the whole header band (handle + title row) drags, not just
                // the 4px handle bar - much easier to hit with a thumb
                if (e.touches[0].clientY - rect.top > 64) { return; }
                dragY = e.touches[0].clientY;
                dragDy = 0;
                el.style.transition = 'none';
                el.style.animation = 'none';
            }, { passive: true });
            el.addEventListener('touchmove', function (e) {
                if (dragY == null) { return; }
                dragDy = Math.max(0, e.touches[0].clientY - dragY);
                el.style.transform = 'translateY(' + dragDy + 'px)';
                e.preventDefault();   // the pull must not scroll the sheet
            }, { passive: false });
            var end = function () {
                if (dragY == null) { return; }
                dragY = null;
                el.style.transition = '';
                el.style.animation = '';
                el.style.transform = '';
                if (dragDy > 80) {
                    $scope.$applyAsync(function () { setter($scope, 0); });
                }
            };
            el.addEventListener('touchend', end);
            el.addEventListener('touchcancel', end);
        }
    };
}]);

// Projection stepper: [-] value [+] with the label under. Steps go through
// the controller's increase/decreaseProjection (hold a button to auto-repeat);
// tapping the number edits it in place via CONTENTEDITABLE - deliberately no
// <input> (DNN's login form makes browsers offer the password manager on
// inputs; same trick as proj-ce-search). Enter/blur commits, Esc cancels,
// Up/Down arrows step, keystrokes are filtered to valid partial numbers.
// The directive owns the value text (no {{}} binding) so digests can't
// stomp the caret mid-edit; a watcher re-renders on outside changes
// (fast-update, resets).
mainLayoutApp.directive('fscProjStepper', [function () {
    return {
        restrict: 'A',
        link: function ($scope, $element, $attrs) {
            var el = $element[0];
            var p = $scope.p;
            var m = $scope.m;
            if (!m) { return; }
            if (!p && $attrs.fscProjStepper !== 'lineups') { return; }
            // modes: '' (user projection), 'admin' (site-wide override),
            // 'maxexp' (V3 max exposure, steps of 5), 'lineups' (the optimizer
            // lineup-count option - integer, clamped to RangeMin/RangeMax,
            // needs no player on scope)
            var mode = $attrs.fscProjStepper || '';
            var admin = mode === 'admin';
            var maxexp = mode === 'maxexp';
            var lineups = mode === 'lineups';
            var valEl = el.querySelector('.fscStepVal');
            var editing = false, preEdit = '';

            // touch devices: the +/- stay hidden until a tap ARMS the control
            // (CSS reveals them via .fscStepArmed under @media (hover:none)).
            // While hidden they're pointer-events:none, so the arming tap can
            // never accidentally step. Tapping outside disarms (one document
            // listener for the whole page). Inert on desktop - the hover CSS
            // ignores the class there.
            el.addEventListener('click', function () {
                if (!window.matchMedia('(hover: none)').matches) { return; }
                if (el.classList.contains('fscStepArmed')) { return; }
                var armed = document.querySelectorAll('.fscStepper.fscStepArmed');
                for (var ai = 0; ai < armed.length; ai++) { armed[ai].classList.remove('fscStepArmed'); }
                el.classList.add('fscStepArmed');
            });
            if (!window._fscStepDisarm) {
                window._fscStepDisarm = true;
                document.addEventListener('click', function (e) {
                    var inside = e.target && e.target.closest && e.target.closest('.fscStepper');
                    var armed = document.querySelectorAll('.fscStepper.fscStepArmed');
                    for (var ai = 0; ai < armed.length; ai++) {
                        if (armed[ai] !== inside) { armed[ai].classList.remove('fscStepArmed'); }
                    }
                }, true);
            }

            // explicit bounds via data-min / data-max on the element - applied
            // to every typed commit and to lineup-count steps (the option's
            // RangeMin/RangeMax isn't always populated, so these are the
            // authoritative backstop)
            var attrMin = parseFloat(el.getAttribute('data-min'));
            var attrMax = parseFloat(el.getAttribute('data-max'));
            var clampAttrs = function (v) {
                if (isFinite(attrMin)) { v = Math.max(attrMin, v); }
                if (isFinite(attrMax)) { v = Math.min(attrMax, v); }
                return v;
            };

            var lineupOpt = function () { return m.lineupCountOpt; };
            var clampLineups = function (v) {
                var opt = lineupOpt();
                var lo = opt ? parseFloat(opt.RangeMin) : NaN;
                var hi = opt ? parseFloat(opt.RangeMax) : NaN;
                if (isFinite(lo)) { v = Math.max(lo, v); }
                if (isFinite(hi)) { v = Math.min(hi, v); }
                return Math.round(clampAttrs(v));
            };
            var getVal = function () {
                if (lineups) { var o = lineupOpt(); return o ? o.Val1 : ''; }
                return admin ? p.OverridePP : (maxexp ? p.MaxExp : p.UserPP);
            };
            var fmt = function (v) {
                var n = parseFloat(v);
                if (!isFinite(n)) { return v == null ? '' : String(v); }
                return String(Math.round(n * 100) / 100);
            };
            var render = function () {
                if (editing) { return; }
                valEl.textContent = fmt(getVal());
                valEl.setAttribute('aria-valuenow', getVal());
            };
            $scope.$watch(getVal, render);
            render();

            var step = function (dir) {
                if (editing) { commitEdit(); }
                $scope.$apply(function () {
                    if (lineups) {
                        var o = lineupOpt();
                        if (!o) { return; }
                        o.Val1 = clampLineups((parseFloat(o.Val1) || 0) + dir);
                        m.onOptValChanged(o);
                    } else if (admin) {
                        if (dir > 0) { m.incAdminProjection(p); } else { m.decAdminProjection(p); }
                    } else if (maxexp) {
                        m.updateMaxExp(p, dir * 5);   // exposure steps by 5%
                    } else {
                        if (dir > 0) { m.increaseProjection(p); } else { m.decreaseProjection(p); }
                    }
                });
            };

            // +/- with press-and-hold auto-repeat
            var bindStep = function (btn, dir) {
                var holdT = null, repT = null;
                var clear = function () { clearTimeout(holdT); clearInterval(repT); };
                btn.addEventListener('pointerdown', function (e) {
                    // mouse: primary button only (right/middle must not step)
                    if (e.pointerType === 'mouse' && e.button !== 0) { return; }
                    e.preventDefault();
                    e.stopPropagation();
                    step(dir);
                    holdT = setTimeout(function () {
                        repT = setInterval(function () { step(dir); }, 90);
                    }, 450);
                });
                ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
                    btn.addEventListener(ev, clear);
                });
                $scope.$on('$destroy', clear);
            };
            bindStep(el.querySelector('.fscStepMinus'), -1);
            bindStep(el.querySelector('.fscStepPlus'), 1);

            // tap-to-type
            var startEdit = function () {
                if (editing) { return; }
                editing = true;
                preEdit = valEl.textContent;
                valEl.setAttribute('contenteditable', 'plaintext-only');
                if (!valEl.isContentEditable) { valEl.setAttribute('contenteditable', 'true'); }
                el.classList.add('fscStepperEditing');
                valEl.focus();
                // select the whole number so typing replaces it
                var range = document.createRange();
                range.selectNodeContents(valEl);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            };
            var endEditDom = function () {
                editing = false;
                valEl.removeAttribute('contenteditable');
                el.classList.remove('fscStepperEditing');
            };
            var commitEdit = function () {
                if (!editing) { return; }
                var parsed = parseFloat(valEl.textContent.replace(',', '.'));
                endEditDom();
                if (isNaN(parsed)) { render(); return; }   // gibberish/empty -> revert
                parsed = clampAttrs(parsed);
                $scope.$apply(function () {
                    if (lineups) {
                        var o = lineupOpt();
                        if (o) { o.Val1 = clampLineups(parsed); m.onOptValChanged(o); }
                    } else if (admin) {
                        p.OverridePP = parsed;
                        m.onAdminProjModified(p);
                        m.onAdminProjChanged(p);
                    } else if (maxexp) {
                        p.MaxExp = parsed;
                        m.onMaxExpChanged(p);
                    } else {
                        p.UserPP = parsed;
                        m.onProjChanged(p);
                    }
                });
                render();
            };
            var cancelEdit = function () {
                if (!editing) { return; }
                endEditDom();
                valEl.textContent = preEdit;
            };

            valEl.addEventListener('click', function (e) { e.stopPropagation(); startEdit(); });
            valEl.addEventListener('focus', function () { startEdit(); });
            valEl.addEventListener('blur', commitEdit);
            valEl.addEventListener('keydown', function (e) {
                e.stopPropagation();
                if (e.key === 'Enter') { e.preventDefault(); valEl.blur(); return; }
                if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); valEl.blur(); return; }
                if (e.key === 'ArrowUp') { e.preventDefault(); step(1); return; }
                if (e.key === 'ArrowDown') { e.preventDefault(); step(-1); return; }
                var ctrl = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'];
                if (ctrl.indexOf(e.key) >= 0 || e.ctrlKey || e.metaKey) { return; }
                // valid partial number only: digits + one dot (projections
                // are never negative)
                var text = valEl.textContent;
                var selLen = String(window.getSelection()).length;
                if (/^[0-9]$/.test(e.key)) { return; }
                if (e.key === '.' && !lineups && (text.indexOf('.') < 0 || selLen === text.length)) { return; }   // lineup counts are integers
                e.preventDefault();
            });
            // strip anything invalid that sneaks in via paste
            valEl.addEventListener('input', function () {
                if (!editing) { return; }
                var clean = valEl.textContent.replace(/[^0-9.]/g, '');
                if (clean !== valEl.textContent) { valEl.textContent = clean; }
            });
        }
    };
}]);

// Mobile-only "hide the header while scrolling down": toggles the class named
// by the attribute value on the element - down adds it, up removes it. Driven
// by wheel/touch INPUT (never scroll events, whose direction lies when content
// height mutates - same rationale as the toolbar's onScrollIntent).
mainLayoutApp.directive('fscHideHdrOnScroll', [function () {
    return {
        restrict: 'A',
        link: function ($scope, $element, attrs) {
            var el = $element[0];
            var cls = attrs.fscHideHdrOnScroll || 'fscHdrHide';
            var apply = function (dir) {
                if (window.innerWidth > 800) { return; }
                el.classList.toggle(cls, dir > 0);
            };
            el.addEventListener('wheel', function (e) {
                if (e.deltaY > 0) { apply(1); } else if (e.deltaY < 0) { apply(-1); }
            }, { passive: true });
            var ty = null;
            el.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
            el.addEventListener('touchmove', function (e) {
                if (ty == null) { return; }
                var y = e.touches[0].clientY, dy = ty - y;   // finger up = scroll down
                if (Math.abs(dy) > 10) { apply(dy > 0 ? 1 : -1); ty = y; }
            }, { passive: true });
            el.addEventListener('touchend', function () { ty = null; });
        }
    };
}]);

// Tap-to-open flyout shell (the optimizer button): a click on the trigger
// (any part of the element OUTSIDE the .lbMiniFlyout panel) toggles .is-open;
// clicks inside the panel don't, except on .lbMiniFlyoutClose elements which
// close it (e.g. the Optimize action). A capture-phase document click closes
// on any outside tap (immune to stopPropagation below document), as does
// Escape. Enter/Space on the focused trigger toggles for keyboard users.
mainLayoutApp.directive("fscTapOpen", [function () {
    return {
        restrict: "A",
        link: function ($scope, $element) {
            var el = $element[0];
            // TWO things hold this panel open, and every close path has to
            // clear both: the .is-open class, and the pane flags behind
            // .lbMiniSettingsPinned. The hiding rule is
            //   .lbMiniTapOpen:not(.is-open):not(.lbMiniSettingsPinned)
            // so dropping is-open on its own is not enough once you have
            // drilled into Player groups or Team stacks - the pinned class
            // keeps the panel up and the click appears to do nothing.
            var isShowing = function () {
                return el.classList.contains('is-open') || el.classList.contains('lbMiniSettingsPinned');
            };
            var closeAll = function () {
                el.classList.remove('is-open');
                if ($scope.m && $scope.m.closeOptimizerPanes) {
                    // $applyAsync, not $apply: this runs from a native listener
                    // that can fire mid-digest. The class drop is synchronous
                    // and the flags clear on the next tick, which is a frame
                    // either way.
                    $scope.$applyAsync(function () { $scope.m.closeOptimizerPanes(); });
                }
            };
            el.addEventListener('click', function (e) {
                var t = e.target;
                if (t && t.closest) {
                    if (t.closest('.lbMiniFlyoutClose')) { closeAll(); return; }
                    var fly = t.closest('.lbMiniFlyout');
                    if (fly) {
                        // a click on the flyout ELEMENT itself rather than a
                        // child is the scrim: the desktop modal's backdrop and
                        // the mobile sheet's ::before both target the element
                        if (t === fly) { closeAll(); }
                        return;
                    }
                }
                // Positively identify the TRIGGER rather than inferring it from
                // "not inside the flyout". ng-click swaps panes through ng-if
                // BEFORE this bubbles up, so by the time the event reaches the
                // directive e.target can already be detached - and closest() on
                // a detached node returns null, which read as an outside click
                // and closed the panel on every drill-in.
                //
                // Closing goes through closeAll for the same reason as above: a
                // bare toggle would strip is-open and leave a drilled-in panel
                // pinned open.
                if (t === el || (t && t.closest && t.closest('.lbMiniOptLabel'))) {
                    if (isShowing()) { closeAll(); } else { el.classList.add('is-open'); }
                }
            });
            el.addEventListener('keydown', function (e) {
                if ((e.key === 'Enter' || e.key === ' ') && e.target === el) {
                    e.preventDefault();
                    if (isShowing()) { closeAll(); } else { el.classList.add('is-open'); }
                }
                if (e.key === 'Escape') { closeAll(); }
            });
            var onDoc = function (e) {
                // pinned counts as showing: this used to bail out before it
                // could close anything whenever a cascaded pane was up
                if (!isShowing()) { return; }
                if (el.contains(e.target)) { return; }
                closeAll();
            };
            document.addEventListener('click', onDoc, true);
            // drag-to-close for the mobile bottom sheet: a touch-drag starting
            // in the card's top strip (the drag handle) follows the finger;
            // releasing past 80px dismisses (unpinning any detail pane too),
            // anything less springs back. Desktop widths never engage.
            var fly = el.querySelector('.lbMiniFlyout');
            var card = el.querySelector('.lbMiniFlyoutCard');
            if (fly && card) {
                var dragY = null, dragDy = 0;
                card.addEventListener('touchstart', function (e) {
                    if (window.innerWidth > 800) { return; }
                    var rect = card.getBoundingClientRect();
                    // whole header band (handle + X + title) drags, not just
                    // the 4px handle bar
                    if (e.touches[0].clientY - rect.top > 64) { return; }
                    dragY = e.touches[0].clientY;
                    dragDy = 0;
                    fly.style.transition = 'none';
                }, { passive: true });
                card.addEventListener('touchmove', function (e) {
                    if (dragY == null) { return; }
                    dragDy = Math.max(0, e.touches[0].clientY - dragY);
                    fly.style.transform = 'translateY(' + dragDy + 'px)';
                    e.preventDefault();   // the pull must not scroll the card
                }, { passive: false });
                var endDrag = function () {
                    if (dragY == null) { return; }
                    dragY = null;
                    // clear the inline overrides: the stylesheet state takes
                    // back over (slide down if closed, spring back if not)
                    fly.style.transition = '';
                    fly.style.transform = '';
                    if (dragDy > 80) { closeAll(); }
                };
                card.addEventListener('touchend', endDrag);
                card.addEventListener('touchcancel', endDrag);
            }
            $scope.$on('$destroy', function () {
                document.removeEventListener('click', onDoc, true);
            });
        }
    };
}]);

mainLayoutApp.directive("onScroll", [function () {
    var previousScroll = 0;
    var link = function ($scope, $element, attrs) {
        $element.bind('scroll', function (evt) {
            var currentScroll = $element.scrollTop();
            $scope.$eval(attrs["onScroll"], { $event: evt, $direct: currentScroll > previousScroll ? 1 : -1 });
            previousScroll = currentScroll;
        });
    };
    return {
        restrict: "A",
        link: link
    };
}]);
mainLayoutApp.directive('scroll', [function () {
    return {
        link: function ($scope, elem, attrs) {
            elem.on('scroll', function (e) {
                $scope.$parent.m.onTableScrolled(e.currentTarget);
            });
            // REAL-INPUT direction for the toolbar auto-collapse: wheel and
            // touch only ever fire from the user, so unlike scroll events
            // they can't be faked by scroll-anchoring corrections when chart
            // re-renders change content height (see onScrollIntent).
            var el = elem[0];
            // dir plus a PIXEL MAGNITUDE - onScrollIntent needs the distance
            // to tell a deliberate scroll back up from an incidental tick.
            var intent = function (dir, px) {
                var m = $scope.$parent.m;
                if (m && m.onScrollIntent) { m.onScrollIntent(dir, el, px); }
            };
            el.addEventListener('wheel', function (e) {
                var d = e.deltaY;
                if (!d) { return; }
                var px = Math.abs(d);
                // deltaMode 1 = lines, 2 = pages; normalise both to pixels or
                // a line-scrolling mouse would never reach the threshold
                if (e.deltaMode === 1) { px *= 16; }
                else if (e.deltaMode === 2) { px *= (el.clientHeight || 400); }
                intent(d > 0 ? 1 : -1, px);
            }, { passive: true });
            var touchY = null;
            el.addEventListener('touchstart', function (e) {
                touchY = e.touches[0].clientY;
            }, { passive: true });
            el.addEventListener('touchmove', function (e) {
                if (touchY == null) { return; }
                var y = e.touches[0].clientY;
                var dy = touchY - y;               // finger up = content scrolls down
                if (Math.abs(dy) > 8) {
                    intent(dy > 0 ? 1 : -1, Math.abs(dy));
                    touchY = y;
                }
            }, { passive: true });
            el.addEventListener('touchend', function () { touchY = null; });
        }
  }
}]);

mainLayoutApp.directive('fileChange', ['$parse', function ($parse) {
    return {
        require: 'ngModel',
        restrict: 'A',
        link: function ($scope, element, attrs, ngModel) {
            var attrHandler = $parse(attrs['fileChange']);
            var handler = function (e) {
                $scope.$apply(function () {
                    attrHandler($scope, { $event: e, files: e.target.files });
                });
            };
            element[0].addEventListener('change', handler, false);
        }
    };
}]);

// Drag-and-drop file target. Angular 1.5 has nothing for this, and the
// input[type=file] it sits over cannot be styled, so the zone is a plain
// element and the input behind it only serves the click and keyboard path.
//
// Two things here are not obvious:
//
//  - dragenter/dragleave fire again for every child element the pointer
//    crosses, so a naive add/remove on those flickers the highlight off as
//    soon as the cursor moves over the label inside. The depth counter is
//    what makes the state survive the inner elements.
//
//  - the DOCUMENT is guarded while the zone is alive. Without it a file
//    dropped a few pixels outside the frame makes the browser navigate away
//    to that file, and the user loses whatever was in the dialog. Both
//    listeners come off on $destroy, and the zone only exists while the
//    import pane is open, so nothing global outlives it.
mainLayoutApp.directive('fscFileDrop', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var el = element[0];
            var handler = $parse(attrs['fscFileDrop']);
            var depth = 0;

            var stop = function (e) { e.preventDefault(); e.stopPropagation(); };

            var onEnter = function (e) {
                stop(e);
                depth++;
                el.classList.add('is-over');
			};

            var onOver = function (e) {
                stop(e);
                // without an explicit copy effect some browsers show the "no
                // entry" cursor over a perfectly valid target
                if (e.dataTransfer) { e.dataTransfer.dropEffect = 'copy'; }
			};

            var onLeave = function (e) {
                stop(e);
                depth = Math.max(0, depth - 1);
                if (!depth) { el.classList.remove('is-over'); }
			};

            var onDrop = function (e) {
                stop(e);
                depth = 0;
                el.classList.remove('is-over');

                var dt = e.dataTransfer;
                var file = (dt && dt.files && dt.files.length) ? dt.files[0] : null;
                if (file == null) { return; }

                scope.$apply(function () { handler(scope, { file: file }); });
			};

            el.addEventListener('dragenter', onEnter, false);
            el.addEventListener('dragover', onOver, false);
            el.addEventListener('dragleave', onLeave, false);
            el.addEventListener('drop', onDrop, false);

            // a near miss must not navigate the page away
            var swallow = function (e) { e.preventDefault(); };
            document.addEventListener('dragover', swallow, false);
            document.addEventListener('drop', swallow, false);

            scope.$on('$destroy', function () {
                el.removeEventListener('dragenter', onEnter, false);
                el.removeEventListener('dragover', onOver, false);
                el.removeEventListener('dragleave', onLeave, false);
                el.removeEventListener('drop', onDrop, false);
                document.removeEventListener('dragover', swallow, false);
                document.removeEventListener('drop', swallow, false);
			});
		}
	};
}]);

// contenteditable bound to ngModel - the player search boxes use this (instead of an
// <input>) so DNN's login form doesn't trigger the browser password-manager prompt.
// ng-change still fires on every edit via $setViewValue.
mainLayoutApp.directive('projCeSearch', function () {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attrs, ngModel) {
            var el = element[0];
            element.on('input', function () {
                if ((el.textContent || '') === '') { el.innerHTML = ''; }   // restore :empty placeholder
                scope.$apply(function () {
                    ngModel.$setViewValue((el.textContent || '').replace(/\s+/g, ' ').trim());
                });
            });
            element.on('keydown', function (e) {
                if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); }
            });
            element.on('paste', function (e) {
                e.preventDefault();
                var t = (((e.originalEvent || e).clipboardData || window.clipboardData).getData('text') || '');
                document.execCommand('insertText', false, t.replace(/[\r\n]+/g, ' '));
            });
            ngModel.$render = function () {
                var val = ngModel.$viewValue || '';
                if ((el.textContent || '') !== val) { el.textContent = val; }
            };
        }
    };
});

var LZString = { _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", _f: String.fromCharCode, compressToBase64: function (r) { if (null == r) return ""; var e, t, a, o, i, n, s, c = "", h = 0; for (r = LZString.compress(r); h < 2 * r.length;)h % 2 == 0 ? (e = r.charCodeAt(h / 2) >> 8, t = 255 & r.charCodeAt(h / 2), a = h / 2 + 1 < r.length ? r.charCodeAt(h / 2 + 1) >> 8 : NaN) : (e = 255 & r.charCodeAt((h - 1) / 2), (h + 1) / 2 < r.length ? (t = r.charCodeAt((h + 1) / 2) >> 8, a = 255 & r.charCodeAt((h + 1) / 2)) : t = a = NaN), h += 3, o = e >> 2, i = (3 & e) << 4 | t >> 4, n = (15 & t) << 2 | a >> 6, s = 63 & a, isNaN(t) ? n = s = 64 : isNaN(a) && (s = 64), c = c + LZString._keyStr.charAt(o) + LZString._keyStr.charAt(i) + LZString._keyStr.charAt(n) + LZString._keyStr.charAt(s); return c }, decompressFromBase64: function (r) { if (null == r) return ""; var e, t, a, o, i, n, s, c = "", h = 0, p = 0, f = LZString._f; for (r = r.replace(/[^A-Za-z0-9\+\/\=]/g, ""); p < r.length;)t = LZString._keyStr.indexOf(r.charAt(p++)) << 2 | (i = LZString._keyStr.indexOf(r.charAt(p++))) >> 4, a = (15 & i) << 4 | (n = LZString._keyStr.indexOf(r.charAt(p++))) >> 2, o = (3 & n) << 6 | (s = LZString._keyStr.indexOf(r.charAt(p++))), h % 2 == 0 ? (e = t << 8, 64 != n && (c += f(e | a)), 64 != s && (e = o << 8)) : (c += f(e | t), 64 != n && (e = a << 8), 64 != s && (c += f(e | o))), h += 3; return LZString.decompress(c) }, compressToUTF16: function (r) { if (null == r) return ""; var e, t, a, o = "", i = 0, n = LZString._f; for (r = LZString.compress(r), e = 0; e < r.length; e++)switch (t = r.charCodeAt(e), i++) { case 0: o += n(32 + (t >> 1)), a = (1 & t) << 14; break; case 1: o += n(a + (t >> 2) + 32), a = (3 & t) << 13; break; case 2: o += n(a + (t >> 3) + 32), a = (7 & t) << 12; break; case 3: o += n(a + (t >> 4) + 32), a = (15 & t) << 11; break; case 4: o += n(a + (t >> 5) + 32), a = (31 & t) << 10; break; case 5: o += n(a + (t >> 6) + 32), a = (63 & t) << 9; break; case 6: o += n(a + (t >> 7) + 32), a = (127 & t) << 8; break; case 7: o += n(a + (t >> 8) + 32), a = (255 & t) << 7; break; case 8: o += n(a + (t >> 9) + 32), a = (511 & t) << 6; break; case 9: o += n(a + (t >> 10) + 32), a = (1023 & t) << 5; break; case 10: o += n(a + (t >> 11) + 32), a = (2047 & t) << 4; break; case 11: o += n(a + (t >> 12) + 32), a = (4095 & t) << 3; break; case 12: o += n(a + (t >> 13) + 32), a = (8191 & t) << 2; break; case 13: o += n(a + (t >> 14) + 32), a = (16383 & t) << 1; break; case 14: o += n(a + (t >> 15) + 32, 32 + (32767 & t)), i = 0 }return o + n(a + 32) }, decompressFromUTF16: function (r) { if (null == r) return ""; for (var e, t, a = "", o = 0, i = 0, n = LZString._f; i < r.length;) { switch (t = r.charCodeAt(i) - 32, o++) { case 0: e = t << 1; break; case 1: a += n(e | t >> 14), e = (16383 & t) << 2; break; case 2: a += n(e | t >> 13), e = (8191 & t) << 3; break; case 3: a += n(e | t >> 12), e = (4095 & t) << 4; break; case 4: a += n(e | t >> 11), e = (2047 & t) << 5; break; case 5: a += n(e | t >> 10), e = (1023 & t) << 6; break; case 6: a += n(e | t >> 9), e = (511 & t) << 7; break; case 7: a += n(e | t >> 8), e = (255 & t) << 8; break; case 8: a += n(e | t >> 7), e = (127 & t) << 9; break; case 9: a += n(e | t >> 6), e = (63 & t) << 10; break; case 10: a += n(e | t >> 5), e = (31 & t) << 11; break; case 11: a += n(e | t >> 4), e = (15 & t) << 12; break; case 12: a += n(e | t >> 3), e = (7 & t) << 13; break; case 13: a += n(e | t >> 2), e = (3 & t) << 14; break; case 14: a += n(e | t >> 1), e = (1 & t) << 15; break; case 15: a += n(e | t), o = 0 }i++ } return LZString.decompress(a) }, compress: function (r) { if (null == r) return ""; var e, t, a, o = {}, i = {}, n = "", s = "", c = "", h = 2, p = 3, f = 2, l = "", k = 0, d = 0, b = LZString._f; for (a = 0; a < r.length; a += 1)if (n = r.charAt(a), Object.prototype.hasOwnProperty.call(o, n) || (o[n] = p++, i[n] = !0), s = c + n, Object.prototype.hasOwnProperty.call(o, s)) c = s; else { if (Object.prototype.hasOwnProperty.call(i, c)) { if (c.charCodeAt(0) < 256) { for (e = 0; e < f; e++)k <<= 1, 15 == d ? (d = 0, l += b(k), k = 0) : d++; for (t = c.charCodeAt(0), e = 0; e < 8; e++)k = k << 1 | 1 & t, 15 == d ? (d = 0, l += b(k), k = 0) : d++, t >>= 1 } else { for (t = 1, e = 0; e < f; e++)k = k << 1 | t, 15 == d ? (d = 0, l += b(k), k = 0) : d++, t = 0; for (t = c.charCodeAt(0), e = 0; e < 16; e++)k = k << 1 | 1 & t, 15 == d ? (d = 0, l += b(k), k = 0) : d++, t >>= 1 } 0 == --h && (h = Math.pow(2, f), f++), delete i[c] } else for (t = o[c], e = 0; e < f; e++)k = k << 1 | 1 & t, 15 == d ? (d = 0, l += b(k), k = 0) : d++, t >>= 1; 0 == --h && (h = Math.pow(2, f), f++), o[s] = p++, c = String(n) } if ("" !== c) { if (Object.prototype.hasOwnProperty.call(i, c)) { if (c.charCodeAt(0) < 256) { for (e = 0; e < f; e++)k <<= 1, 15 == d ? (d = 0, l += b(k), k = 0) : d++; for (t = c.charCodeAt(0), e = 0; e < 8; e++)k = k << 1 | 1 & t, 15 == d ? (d = 0, l += b(k), k = 0) : d++, t >>= 1 } else { for (t = 1, e = 0; e < f; e++)k = k << 1 | t, 15 == d ? (d = 0, l += b(k), k = 0) : d++, t = 0; for (t = c.charCodeAt(0), e = 0; e < 16; e++)k = k << 1 | 1 & t, 15 == d ? (d = 0, l += b(k), k = 0) : d++, t >>= 1 } 0 == --h && (h = Math.pow(2, f), f++), delete i[c] } else for (t = o[c], e = 0; e < f; e++)k = k << 1 | 1 & t, 15 == d ? (d = 0, l += b(k), k = 0) : d++, t >>= 1; 0 == --h && (h = Math.pow(2, f), f++) } for (t = 2, e = 0; e < f; e++)k = k << 1 | 1 & t, 15 == d ? (d = 0, l += b(k), k = 0) : d++, t >>= 1; for (; ;) { if (k <<= 1, 15 == d) { l += b(k); break } d++ } return l }, decompress: function (r) { if (null == r) return ""; if ("" == r) return null; var e, t, a, o, i, n, s, c = [], h = 4, p = 4, f = 3, l = "", k = "", d = LZString._f, b = { string: r, val: r.charCodeAt(0), position: 32768, index: 1 }; for (e = 0; e < 3; e += 1)c[e] = e; for (a = 0, i = Math.pow(2, 2), n = 1; n != i;)o = b.val & b.position, b.position >>= 1, 0 == b.position && (b.position = 32768, b.val = b.string.charCodeAt(b.index++)), a |= (o > 0 ? 1 : 0) * n, n <<= 1; switch (a) { case 0: for (a = 0, i = Math.pow(2, 8), n = 1; n != i;)o = b.val & b.position, b.position >>= 1, 0 == b.position && (b.position = 32768, b.val = b.string.charCodeAt(b.index++)), a |= (o > 0 ? 1 : 0) * n, n <<= 1; s = d(a); break; case 1: for (a = 0, i = Math.pow(2, 16), n = 1; n != i;)o = b.val & b.position, b.position >>= 1, 0 == b.position && (b.position = 32768, b.val = b.string.charCodeAt(b.index++)), a |= (o > 0 ? 1 : 0) * n, n <<= 1; s = d(a); break; case 2: return "" }for (c[3] = s, t = k = s; ;) { if (b.index > b.string.length) return ""; for (a = 0, i = Math.pow(2, f), n = 1; n != i;)o = b.val & b.position, b.position >>= 1, 0 == b.position && (b.position = 32768, b.val = b.string.charCodeAt(b.index++)), a |= (o > 0 ? 1 : 0) * n, n <<= 1; switch (s = a) { case 0: for (a = 0, i = Math.pow(2, 8), n = 1; n != i;)o = b.val & b.position, b.position >>= 1, 0 == b.position && (b.position = 32768, b.val = b.string.charCodeAt(b.index++)), a |= (o > 0 ? 1 : 0) * n, n <<= 1; c[p++] = d(a), s = p - 1, h--; break; case 1: for (a = 0, i = Math.pow(2, 16), n = 1; n != i;)o = b.val & b.position, b.position >>= 1, 0 == b.position && (b.position = 32768, b.val = b.string.charCodeAt(b.index++)), a |= (o > 0 ? 1 : 0) * n, n <<= 1; c[p++] = d(a), s = p - 1, h--; break; case 2: return k }if (0 == h && (h = Math.pow(2, f), f++), c[s]) l = c[s]; else { if (s !== p) return null; l = t + t.charAt(0) } k += l, c[p++] = t + l.charAt(0), t = l, 0 == --h && (h = Math.pow(2, f), f++) } } };
