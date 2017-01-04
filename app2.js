/* jshint asi:true, esversion:6 */
var dimensions = Math.min(window.innerWidth, window.innerHeight) - 100
try {
  var hasSharedArrayBuffer = !!SharedArrayBuffer
} catch(e) {
  var hasSharedArrayBuffer = false
}

var scene = new THREE.Scene()
var camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
camera.position.set(0, 2, 8)

var renderer = new THREE.WebGLRenderer()
renderer.setSize(dimensions, dimensions)
document.body.appendChild(renderer.domElement)

var material = new THREE.MeshBasicMaterial({wireframe: true})
var SIZE = 5476284 // I'm lazy, so this is the hardcoded amount of Float32 we will download in total
var modelBuffer = new SharedArrayBuffer(SIZE * 4) // this is where we will put the bytes as they arrive
var modelVertices = new Float32Array(modelBuffer) // holds the vertices
var totalFrames = 0, loadStarted = false

var geometry = new THREE.BufferGeometry()
geometry.addAttribute('position', new THREE.BufferAttribute(modelVertices, 3))

var mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)

var button = document.createElement('button')
button.textContent = 'Start loading'
button.style.display = 'block'
button.addEventListener('click', function() {
  if(!hasSharedArrayBuffer) {
    alert('This browser does not support SharedArrayBuffer :(')
    return
  }
  var t0 = performance.now()
  var worker = new Worker('streaming-worker.js')
  var positionUpdateOffset = 0
  worker.onmessage = function(msg) {
    if(hasSharedArrayBuffer) {
      byteOffset = msg.data
    }
    var positionsReceived = Math.floor(byteOffset / 12) // 3 Floats, 4 bytes each = 1 position (x,y,z)
    var trianglesReady = Math.floor(positionsReceived / 3)
    requestIdleCallback(function() { // only do work when the thread isn't busy
      geometry.setDrawRange(0, positionsReceived - 1)
      // We only update the buffer where we've got new values
      geometry.attributes.position.updateRange.start = positionUpdateOffset
      geometry.attributes.position.updateRange.count = positionsReceived - positionUpdateOffset
      geometry.attributes.position.needsUpdate = true
      positionUpdateOffset = positionsReceived
    })
    if(byteOffset === geometry.attributes.position.array.byteLength) {
      var t1 = performance.now()
      var secondsTaken = (t1-t0) / 1000
      console.log(`Ready after ${secondsTaken} s`)
      alert(`Ready after ${secondsTaken.toFixed(2)} seconds. Avg. ${(totalFrames / secondsTaken).toFixed(2)} fps`)
    }
  }

  worker.postMessage(modelBuffer, [modelBuffer])
  loadStarted = true
  document.body.removeChild(button)
})
document.body.appendChild(button)

requestAnimationFrame(function render() {
  requestAnimationFrame(render)
  if(loadStarted) totalFrames++
  mesh.rotation.y += Math.PI / 200
  renderer.render(scene, camera)
})
