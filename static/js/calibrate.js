(()=>{
    "use strict";
    var t = {
        818: (t,e,r)=>{
            t.exports = "/static/assets/calibrate.9f6c.mp3"
        }
    }
      , e = {};
    function r(o) {
        var n = e[o];
        if (void 0 !== n)
            return n.exports;
        var c = e[o] = {
            exports: {}
        };
        return t[o](c, c.exports, r),
        c.exports
    }
    r.g = function() {
        if ("object" == typeof globalThis)
            return globalThis;
        try {
            return this || new Function("return this")()
        } catch (t) {
            if ("object" == typeof window)
                return window
        }
    }(),
    (()=>{
        var t;
        r.g.importScripts && (t = r.g.location + "");
        var e = r.g.document;
        if (!t && e && (e.currentScript && (t = e.currentScript.src),
        !t)) {
            var o = e.getElementsByTagName("script");
            o.length && (t = o[o.length - 1].src)
        }
        if (!t)
            throw new Error("Automatic publicPath is not supported in this browser");
        t = t.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/"),
        r.p = t + "../"
    }
    )(),
    (()=>{
        var t = r(818);
        function e(t) {
            const e = window.calibrateActx.currentTime - window.actxStartTime;
            console.log(e);
            var r = 1;
            e > 0 && e <= 2 && (console.log("Calibration stage 1", t),
            r = 1),
            e > 2 && e <= 4 && (console.log("Calibration stage 2", t),
            r = 2),
            e > 4 && e <= 6 && (console.log("Calibration stage 3", t),
            r = 3),
            e > 6 && e <= 8 && (console.log("Calibration stage 4", t),
            r = 4),
            document.querySelector("#result" + r).innerText = Math.round(1e3 * (e - (2 * r - .5)))
        }
        window.addEventListener("DOMContentLoaded", (function() {
            fetch(t).then((t=>t.arrayBuffer())).then((t=>{
                window.caliBrateAudioArrayBuffer = t
            }
            )).catch((()=>{
                alert("?????????????????????????????????")
            }
            ))
        }
        )),
        document.querySelector("button#startBtn").addEventListener("click", (function() {
            null != window.caliBrateAudioArrayBuffer ? (window.calibrateActx = null,
            window.oggCompatible = !!(new Audio).canPlayType('audio/ogg'),
        	window.calibrateActx = new (window.oggCompatible ? window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext : oggmented.OggmentedAudioContext),
            window.calibrateActx.decodeAudioData(window.caliBrateAudioArrayBuffer, (function(t) {
                window.calibraceACtxSource = window.calibrateActx.createBufferSource(),
                window.calibraceACtxSource.buffer = t,
                window.calibraceACtxSource.connect(window.calibrateActx.destination),
                window.actxStartTime = window.calibrateActx.currentTime,
                window.calibraceACtxSource.start(0),
                window.calibraceACtxSource.addEventListener("ended", (function() {
                    null == window.calibrateActx || window.calibrateActx.close(),
                    window.calibrateActx = void 0,
                    document.querySelector("button#startBtn").removeAttribute("disabled"),
                    document.querySelector("button#clickBtn").removeEventListener("click", e),
                    window.calibrateActx = null
                }
                ))
            }), (function() {console.log("eror")})),
            document.querySelector("button#startBtn").setAttribute("disabled", "disabled"),
            document.querySelector("button#clickBtn").addEventListener("click", e)) : alert("????????????????????????????????????????????????")
        }
        )),
        document.body.addEventListener("keydown", (()=>{
            document.querySelector("button#clickBtn").click()
        }
        )),
        document.querySelector("button#cancelBtn").addEventListener("click", (function() {
            document.querySelector("button#startBtn").removeAttribute("disabled"),
            document.querySelector("button#clickBtn").removeEventListener("click", e);
            try {
                window.calibraceACtxSource.stop()
            } catch (t) {}
            const t = parseFloat(document.querySelector("#result1").innerText.replace("-", "-0"))
              , r = parseFloat(document.querySelector("#result2").innerText.replace("-", "-0"))
              , o = parseFloat(document.querySelector("#result3").innerText.replace("-", "-0"))
              , n = parseFloat(document.querySelector("#result4").innerText.replace("-", "-0"))
              , c = Math.round((t + r + o + n) / 4)
              , i = confirm("?????????????????????????????? " + c + " ??????????????????\n???????????????????????????????????????");
            i && (localStorage.setItem("input-offset", c),
            location.href = "/"),
            i || (location.href = "/")
        }
        ))
    }
    )()
}
)();
