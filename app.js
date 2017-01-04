/* jshint asi:true, esversion:6 */
var dimensions = Math.min(window.innerWidth, window.innerHeight) - 150
var statusOutput = document.getElementById('status')

var scene = new THREE.Scene()
var camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
camera.position.set(0, 2, 8)
//camera.position.set(-180, 50, 250)

var renderer = new THREE.WebGLRenderer()
renderer.setSize(dimensions, dimensions)
document.body.appendChild(renderer.domElement)

var material = new THREE.MeshBasicMaterial({wireframe: true})
var SIZE = 5476284 // I'm lazy, so this is the hardcoded amount of Float32 we will download in total
var modelVertices = new Float32Array(SIZE) // holds the vertices
var modelBuffer = new Uint8Array(modelVertices.buffer) // this is where we will put the bytes as they arrive
var bytePerSec = 0, bytesReceived = 0

var geometry = new THREE.BufferGeometry()
geometry.addAttribute('position', new THREE.BufferAttribute(modelVertices, 3))

var mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)

var button = document.createElement('button')
button.textContent = 'Start loading'
button.style.display = 'block'
button.addEventListener('click', function() {
  var t0 = performance.now()

  /*
  This is where the fun begins!

  What we do in this block:
  1. fetch the 'train.bin' file that contains the vertices as a long array of Float32
  2. Get a reader and call `reader.read` which gives us a promise
  3. The promise will resolve as soon as the browser gets a bunch of bytes from the network - this can be any arbitrary number of bytes.
  4. If the result of the promise says "done", we're done and no further bytes will fly in (at this point there are already no new bytes anymore), so we return
  5. The promise resolves with an object holding a `value` property that is a Uint8Array with the bytes that we got from the network. So we move 'em into our ArrayBuffer* that holds the vertices
  6. We keep track of how many bytes we've got so we write new bytes at the right position into the ArrayBuffer*
  7. To make the visual part a little nicer, we only draw the part of the geometry that has been received and we only draw completely downloaded triangles
  8. We read again, which repeats the process from step 3 onwards until we are done!

  *) Well, I use an Uint8Array view on the ArrayBuffer that backs the Float32Array, but that's a detail.
  */
  fetch('plane.bin').then((response) => {
    if(!response.body || !response.body.getReader) {
      alert('Sorry, your browser does not seem to have the Streams API yet :(')
      return response.blob()
    }
    var reader = response.body.getReader()

    var positionsReceived = 0, byteOffset = 0;

    reader.read().then(function processResult(result) {
      // If we are done, we can exit. No more bytes here.
      if(result.done) {
        var t1 = performance.now()
        var output = document.createElement('div')
        output.textContent = `Ready after ${((t1 - t0) / 1000).toFixed(2)} seconds`
        document.body.appendChild(output)
        console.log((t1 - t0) / 1000)
        return // all is read, no more payload bytes
      }

      // Writing the bytes that have just arrived into our vertices array
      modelBuffer.set(result.value, byteOffset)
      byteOffset += result.value.length
      bytePerSec += result.value.length
      bytesReceived = byteOffset

      // Make sure we only draw what we've got
      positionsReceived = Math.floor(byteOffset / 12) // 3 Floats, 4 bytes each = 1 position (x,y,z)
      var trianglesReady = Math.floor(positionsReceived / 3)
      geometry.setDrawRange(0, positionsReceived - 1)
      geometry.attributes.position.needsUpdate = true

      // Read again...
      return reader.read().then(processResult)
    })

  }).catch((err) => {
    console.log('Error: ', err)
    alert('Whoops! ' + err.message)
  })

  document.body.removeChild(button)
})
document.body.appendChild(button)

setTimeout(function resetStatusOutput() {
  statusOutput.textContent = `Received ${numeral(bytesReceived).format('0,0 b')} (${numeral(bytePerSec).format('0,0 b')}/s)`
  bytePerSec = 0
  setTimeout(resetStatusOutput, 1000)
}, 1000)

requestAnimationFrame(function render() {
  requestAnimationFrame(render)
  mesh.rotation.y += Math.PI / 200
  renderer.render(scene, camera)
})
