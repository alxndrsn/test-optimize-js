/* global Worker, btoa, requestAnimationFrame */

var marky = require('marky')
var PromiseWorker = require('promise-worker')
var worker = new PromiseWorker(new Worker('js/worker-bundle.js'))
var median = require('median')
var fetch = window.fetch || require('unfetch')
var Promise = window.Promise || require('lie')
var STARTING_SCRIPT = '/* Paste your JavaScript here! */\n!function() {\n  console.log(\'hello world\')\n}()'

var $ = document.querySelector.bind(document)
var inputTextarea = $('#textarea_input')
var goButton = $('#button_go')
var outputPre = $('#pre_display')
var iterationsInput = $('#input_iterations')
var commonLibsSelect = $('#select_common_libs')

if (window.performance && window.performance.setResourceTimingBufferSize) {
  window.performance.setResourceTimingBufferSize(100000) // fix for firefox performance entry bug
}

commonLibsSelect.addEventListener('change', function(e) {
  var url = e.target.value
  if (!e.target.value) {
    inputTextarea.value = STARTING_SCRIPT
    outputPre.textContent = ''
    return
  }

  goButton.disabled = true
  outputPre.innerText = 'Testing...'
  fetch(url).then(function(resp) { return resp.text() }).then(function(src) {
    inputTextarea.value = src
    testScript()
  })
})

function testScriptLoadTimeIteration (src) {
  return new Promise(function(resolve) {
    window.onDone = function() {
      var stopEntry = marky.stop('script_' + nonce)
      Object.keys(window).forEach(function(key) {
        if (!existingKeys[key]) {
          delete window[key] // undo whatever the script might do to clean up
        }
      })
      resolve(stopEntry.duration)
    }
    var existingKeys = {}
    Object.keys(window).forEach(function(key) {
      existingKeys[key] = true
    })
    var nonce = btoa(Math.random().toString())
    // random nonce to defeat browser caching
    src += ';onDone();/* ' + nonce + ' */'
    var script = document.createElement('script')
    script.textContent = src
    marky.mark('script_' + nonce)
    document.body.appendChild(script)
  })
}

function getIterations () {
  var iterations = parseInt(iterationsInput.value)
  if (iterations <= 0) {
    iterations = 1
  }
  return iterations
}

function testScriptLoadTime (src) {
  var iterations = getIterations()
  var promise = Promise.resolve()
  var durations = []

  function next () {
    return testScriptLoadTimeIteration(src).then(function(duration) {
      durations.push(duration)
    })
  }

  for (var i = 0; i < iterations; i++) {
    promise = promise.then(next)
  }
  return promise.then(function() {
    var theMedian = median(durations)
    return {
      median: theMedian,
      iterations: iterations
    }
  })
}

function testScript () {
  goButton.disabled = true
  outputPre.innerText = 'Testing...'

  var src = inputTextarea.value

  requestAnimationFrame(function() {
    worker.postMessage(src).then(function(optimizedSrc) {
      return testScriptLoadTime(src).then(function(srcLoad) {
        return testScriptLoadTime(optimizedSrc).then(function(optimizedSrcLoad) {
          outputPre.textContent = 'Median of ' + srcLoad.iterations + ' iterations:' +
            '\nWithout optimize-js : ' + srcLoad.median.toFixed(2) + ' ms' +
            '\nWith optimize-js    : ' + optimizedSrcLoad.median.toFixed(2) + ' ms'
          console.log(outputPre.textContent);
          goButton.disabled = false
        })
      })
    }).catch(function(err) {
      outputPre.textContent = err.message + '\n' + err.stack
      goButton.disabled = false
    })
  })
}

inputTextarea.value = STARTING_SCRIPT

goButton.addEventListener('click', function() { testScript() })
