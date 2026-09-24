"use strict";

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

if (!gl)
{
    throw new Error("WebGL is not available.");
}

function compileShader(type, source)
{
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS))
    {
        throw new Error(gl.getShaderInfoLog(result));
    }
    return result;
}

const program = gl.createProgram();
gl.attachShader(program, compileShader(
    gl.VERTEX_SHADER,
    document.getElementById("vertex-shader").textContent
));
gl.attachShader(program, compileShader(
    gl.FRAGMENT_SHADER,
    document.getElementById("fragment-shader").textContent
));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS))
{
    throw new Error(gl.getProgramInfoLog(program));
}
gl.useProgram(program);

const uniforms = {
    model: gl.getUniformLocation(program, "uModel"),
    view: gl.getUniformLocation(program, "uView"),
    projection: gl.getUniformLocation(program, "uProjection"),
    lightDirection: gl.getUniformLocation(program, "uLightDirection"),
    lightColor: gl.getUniformLocation(program, "uLightColor"),
    ambient: gl.getUniformLocation(program, "uAmbient"),
    objectColor: gl.getUniformLocation(program, "uObjectColor")
};

function createMesh(positions, normals)
{
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW
    );

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(normals),
        gl.STATIC_DRAW
    );

    return { positionBuffer, normalBuffer, count: positions.length / 3 };
}

function addTriangle(mesh, a, b, c, normal)
{
    mesh.positions.push(...a, ...b, ...c);
    mesh.normals.push(...normal, ...normal, ...normal);
}

function createCube()
{
    const mesh = { positions: [], normals: [] };
    const faces = [
        [[-1,-1,1], [1,-1,1], [1,1,1], [-1,1,1], [0,0,1]],
        [[1,-1,-1], [-1,-1,-1], [-1,1,-1], [1,1,-1], [0,0,-1]],
        [[-1,-1,-1], [-1,-1,1], [-1,1,1], [-1,1,-1], [-1,0,0]],
        [[1,-1,1], [1,-1,-1], [1,1,-1], [1,1,1], [1,0,0]],
        [[-1,1,1], [1,1,1], [1,1,-1], [-1,1,-1], [0,1,0]],
        [[-1,-1,-1], [1,-1,-1], [1,-1,1], [-1,-1,1], [0,-1,0]]
    ];
    for (const [a, b, c, d, normal] of faces)
    {
        addTriangle(mesh, a, b, c, normal);
        addTriangle(mesh, a, c, d, normal);
    }
    return createMesh(mesh.positions, mesh.normals);
}

function createGround()
{
    const mesh = { positions: [], normals: [] };
    addTriangle(mesh, [-6,0,-6], [6,0,-6], [6,0,6], [0,1,0]);
    addTriangle(mesh, [-6,0,-6], [6,0,6], [-6,0,6], [0,1,0]);
    return createMesh(mesh.positions, mesh.normals);
}

function createPyramid()
{
    const mesh = { positions: [], normals: [] };
    const top = [0,2,0];
    const corners = [[-1,0,1], [1,0,1], [1,0,-1], [-1,0,-1]];
    for (let index = 0; index < 4; index += 1)
    {
        const a = corners[index];
        const b = corners[(index + 1) % 4];
        const edgeA = a.map((value, axis) => value - top[axis]);
        const edgeB = b.map((value, axis) => value - top[axis]);
        const normal = [
            edgeA[1] * edgeB[2] - edgeA[2] * edgeB[1],
            edgeA[2] * edgeB[0] - edgeA[0] * edgeB[2],
            edgeA[0] * edgeB[1] - edgeA[1] * edgeB[0]
        ];
        addTriangle(mesh, a, b, top, normal);
    }
    addTriangle(mesh, corners[0], corners[2], corners[1], [0,-1,0]);
    addTriangle(mesh, corners[0], corners[3], corners[2], [0,-1,0]);
    return createMesh(mesh.positions, mesh.normals);
}

function createSphere(rows, columns)
{
    const mesh = { positions: [], normals: [] };
    for (let row = 0; row < rows; row += 1)
    {
        const top = row / rows * Math.PI;
        const bottom = (row + 1) / rows * Math.PI;
        for (let column = 0; column < columns; column += 1)
        {
            const left = column / columns * Math.PI * 2;
            const right = (column + 1) / columns * Math.PI * 2;
            const points = [
                [Math.sin(top) * Math.cos(left), Math.cos(top), Math.sin(top) * Math.sin(left)],
                [Math.sin(bottom) * Math.cos(left), Math.cos(bottom), Math.sin(bottom) * Math.sin(left)],
                [Math.sin(bottom) * Math.cos(right), Math.cos(bottom), Math.sin(bottom) * Math.sin(right)],
                [Math.sin(top) * Math.cos(right), Math.cos(top), Math.sin(top) * Math.sin(right)]
            ];
            mesh.positions.push(...points[0], ...points[1], ...points[2]);
            mesh.normals.push(...points[0], ...points[1], ...points[2]);
            mesh.positions.push(...points[0], ...points[2], ...points[3]);
            mesh.normals.push(...points[0], ...points[2], ...points[3]);
        }
    }
    return createMesh(mesh.positions, mesh.normals);
}

const cube = createCube();
const sphere = createSphere(16, 24);
const pyramid = createPyramid();
const ground = createGround();

function identity()
{
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}

function multiply(left, right)
{
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column += 1)
    {
        for (let row = 0; row < 4; row += 1)
        {
            result[column * 4 + row] =
                left[row] * right[column * 4] +
                left[row + 4] * right[column * 4 + 1] +
                left[row + 8] * right[column * 4 + 2] +
                left[row + 12] * right[column * 4 + 3];
        }
    }
    return result;
}

function transform(x, y, z, scale, angle)
{
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return new Float32Array([
        scale * cosine, 0, scale * sine, 0,
        0, scale, 0, 0,
        -scale * sine, 0, scale * cosine, 0,
        x, y, z, 1
    ]);
}

function perspective(aspect)
{
    const scale = 1 / Math.tan(Math.PI / 8);
    const range = 0.1 - 100;
    return new Float32Array([
        scale / aspect, 0, 0, 0, 0, scale, 0, 0,
        0, 0, 100.1 / range, -1, 0, 0, 20 / range, 0
    ]);
}

function lookAt(eye, target, up)
{
    const forward = normalize([
        eye[0] - target[0],
        eye[1] - target[1],
        eye[2] - target[2]
    ]);
    const right = normalize([
        up[1] * forward[2] - up[2] * forward[1],
        up[2] * forward[0] - up[0] * forward[2],
        up[0] * forward[1] - up[1] * forward[0]
    ]);
    const correctedUp = [
        forward[1] * right[2] - forward[2] * right[1],
        forward[2] * right[0] - forward[0] * right[2],
        forward[0] * right[1] - forward[1] * right[0]
    ];

    return new Float32Array([
        right[0], correctedUp[0], forward[0], 0,
        right[1], correctedUp[1], forward[1], 0,
        right[2], correctedUp[2], forward[2], 0,
        -dot(right, eye), -dot(correctedUp, eye), -dot(forward, eye), 1
    ]);
}

function normalize(vector)
{
    const length = Math.hypot(...vector);
    return vector.map(value => value / length);
}

function dot(left, right)
{
    return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function draw(mesh, model, color)
{
    const positionLocation = gl.getAttribLocation(program, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    const normalLocation = gl.getAttribLocation(program, "aNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.enableVertexAttribArray(normalLocation);
    gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(uniforms.model, false, model);
    gl.uniform3f(uniforms.objectColor, ...color);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
}

function render()
{
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(window.innerWidth * ratio));
    canvas.height = Math.max(1, Math.floor(window.innerHeight * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 0.3, 0.0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.uniformMatrix4fv(
        uniforms.view,
        false,
        lookAt([0, 6, -14], [0, 0, 0], [0, 1, 0])
    );
    gl.uniformMatrix4fv(
        uniforms.projection,
        false,
        perspective(canvas.width / canvas.height)
    );
    gl.uniform3f(
        uniforms.lightDirection,
        0.5,
        0.2,
        0.5
    );
    gl.uniform3f(uniforms.lightColor, 1.0, 0.45, 0.15);
    gl.uniform1f(uniforms.ambient, 0.05);
    draw(ground, identity(), [0.35, 0.38, 0.42]);
    draw(cube, transform(-2.5, 1, 0, 1, 0), [0.9, 0.25, 0.2]);
    draw(cube, transform(2.5, 1, 0, 1, 0), [0.2, 0.45, 0.95]);
    draw(sphere, transform(0, 0.7, -2.5, 0.7, 0), [0.95, 0.7, 0.15]);
    draw(pyramid, transform(0, 0, 2.5, 1.2, 0), [0.2, 0.8, 0.4]);
}

render();