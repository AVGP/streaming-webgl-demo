/* jshint asi:true, esversion:6 */
self.onmessage = function(msg) {
  var modelBuffer = new Uint8Array(msg.data) // this is a view on the SharedArrayBuffer from the main thread
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
  var reader = response.body.getReader()

  var byteOffset = 0

  reader.read().then(function processResult(result) {
    // If we are done, we can exit. No more bytes here.
    if(result.done) {
      return // all is read, no more payload bytes
    }

    // Writing the bytes that have just arrived into our vertices array
    modelBuffer.set(result.value, byteOffset)
    byteOffset += result.value.length
    self.postMessage(byteOffset) // tell the main thread how many bytes we've got now

    // Read again...
    return reader.read().then(processResult)
  })

})

}
