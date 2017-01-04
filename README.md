# streaming-webgl-demo

Using the [Streams API](https://streams.spec.whatwg.org/) to progressively load and render a 3D model with WebGL.


## Warning

The binary file for the 3D model is quite large (22 megabytes).

## Prerequisites

You need a browser that supports the Streams API. As far as I know right now (January 2017) that is Chrome and Edge.

Firefox has [this bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1128959) to track progress.

## Try it

Go to [avgp.github.io/streaming-webgl-demo](https://avgp.github.io/streaming-webgl-demo) to try it out.

## What it does

The demo downloads a binary file (`plane.bin`) that contains the ~11.8 million vertice positions as an array of `Float32` values.
As the data becomes available, a `Float32Array` is filled with the data from the network.

As the data is linear in a way that each three subsequent floats form a vertex and each three subsequent vertices a triangle, we can simply calculate how many completed triangles we have received at any given point in time and, thus,
render them.

This way we get a streamed rendering of the model.
