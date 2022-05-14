



/*
the FollowFromUpCamera always look at the car from a position abova right over the car
*/
FollowFromUpCamera = function(){

  /* the only data it needs is the position of the camera */
  this.frame = glMatrix.mat4.create();
  
  /* update the camera with the current car position */
  this.update = function(car_position){
    this.frame = car_position;
  }

  /* return the transformation matrix to transform from worlod coordiantes to the view reference frame */
  this.matrix = function(){
    let eye = glMatrix.vec3.create();
    let target = glMatrix.vec3.create();
    let up = glMatrix.vec4.create();
    
    glMatrix.vec3.transformMat4(eye, [0, 30, 0], this.frame);
    glMatrix.vec3.transformMat4(target, [0.0,0.0,0.0,1.0], this.frame);
    glMatrix.vec4.transformMat4(up, [0.0,0.0,-1,0.0], this.frame);
    
    return glMatrix.mat4.lookAt(glMatrix.mat4.create(),eye,target,up.slice(0,3));	
  }
}

/*
the ChaseCamera always look at the car from behind the car, slightly above
*/ 
ChaseCamera = function(){

  /* the only data it needs is the frame of the camera */
  this.frame = [0,0,0];
  
  /* update the camera with the current car position */
  this.update = function(car_frame){
    this.frame = car_frame.slice();
  }

  /* return the transformation matrix to transform from worlod coordiantes to the view reference frame */
  this.matrix = function(){
    let eye = glMatrix.vec3.create();
    let target = glMatrix.vec3.create();
    glMatrix.vec3.transformMat4(eye, [0, 4, 10, 1.0], this.frame);
    glMatrix.vec3.transformMat4(target, [0.0,0.0,0.0,1.0], this.frame);
    return glMatrix.mat4.lookAt(glMatrix.mat4.create(),eye, target,[0, 1, 0]);	
  }
}


/* the main object to be implementd */
var Renderer = new Object();

/* array of cameras that will be used */
Renderer.cameras = [];
// add a FollowFromUpCamera
Renderer.cameras.push(new FollowFromUpCamera());
Renderer.cameras.push(new ChaseCamera());

// set the camera currently in use
Renderer.currentCamera = 1;

/*
create the buffers for an object as specified in common/shapes/triangle.js
*/
Renderer.createObjectBuffers = function (gl, obj) {
  ComputeNormals(obj);

  obj.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, obj.vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  obj.normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, obj.normals, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  obj.indexBufferTriangles = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferTriangles);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, obj.triangleIndices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  // create edges
  var edges = new Uint16Array(obj.numTriangles * 3 * 2);
  for (var i = 0; i < obj.numTriangles; ++i) {
    edges[i * 6 + 0] = obj.triangleIndices[i * 3 + 0];
    edges[i * 6 + 1] = obj.triangleIndices[i * 3 + 1];
    edges[i * 6 + 2] = obj.triangleIndices[i * 3 + 0];
    edges[i * 6 + 3] = obj.triangleIndices[i * 3 + 2];
    edges[i * 6 + 4] = obj.triangleIndices[i * 3 + 1];
    edges[i * 6 + 5] = obj.triangleIndices[i * 3 + 2];
  }

  obj.indexBufferEdges = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferEdges);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, edges, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
};

/*
draw an object as specified in common/shapes/triangle.js for which the buffer 
have alrady been created
*/
Renderer.drawObject = function (gl, obj, fillColor, lineColor) {

  gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
  gl.enableVertexAttribArray(this.uniformShader.aPositionIndex);
  gl.vertexAttribPointer(this.uniformShader.aPositionIndex, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
  gl.enableVertexAttribArray(this.uniformShader.aNormalIndex);
  gl.vertexAttribPointer(this.uniformShader.aNormalIndex, 3, gl.FLOAT, false, 0, 0);

  if(this.wireframeEnabled){
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 1.0);
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferTriangles);
  gl.uniform4fv(this.uniformShader.uColorLocation, fillColor);
  gl.drawElements(gl.TRIANGLES, obj.triangleIndices.length, gl.UNSIGNED_SHORT, 0);

  
  if(this.wireframeEnabled){
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.uniform4fv(this.uniformShader.uColorLocation, lineColor);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferEdges);
    gl.drawElements(gl.LINES, obj.numTriangles * 3 * 2, gl.UNSIGNED_SHORT, 0); //disegna i contorni dei triangoli
  }


  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  gl.disableVertexAttribArray(this.uniformShader.aPositionIndex);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
};

/*
initialize the object in the scene
*/
Renderer.initializeObjects = function (gl) {
  Game.setScene(scene_0);
  this.car = Game.addCar("mycar");
  Renderer.triangle = new Triangle();

  this.cube = new Cube(10);
  this.createObjectBuffers(gl,this.cube);
  
  this.cylinder = new Cylinder(10);
  this.createObjectBuffers(gl,this.cylinder );
  
  Renderer.createObjectBuffers(gl, this.triangle);

  Renderer.createObjectBuffers(gl,Game.scene.trackObj);
  Renderer.createObjectBuffers(gl,Game.scene.groundObj);
  for (var i = 0; i < Game.scene.buildings.length; ++i) 
	  	Renderer.createObjectBuffers(gl,Game.scene.buildingsObj[i]);
};


speedWheelAngle = 0;
/*
draw the car
*/
Renderer.drawCar = function (gl) {

    M                 = glMatrix.mat4.create();
    rotate_transform  = glMatrix.mat4.create();
    translate_matrix  = glMatrix.mat4.create();
    scale_matrix      = glMatrix.mat4.create();
  
    glMatrix.mat4.fromTranslation(translate_matrix,[0,1,1]);
    glMatrix.mat4.fromScaling(scale_matrix,[0.7,0.25,1]);
    glMatrix.mat4.mul(M,scale_matrix,translate_matrix);
    glMatrix.mat4.fromRotation(rotate_transform,-0.1,[1,0,0]);
    glMatrix.mat4.mul(M,rotate_transform,M);
    glMatrix.mat4.fromTranslation(translate_matrix,[0,0.1,-1]);
    glMatrix.mat4.mul(M,translate_matrix,M);

    Renderer.stack.push();
    Renderer.stack.multiply(M);
    gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, this.stack.matrix);

    this.drawObject(gl,this.cube,[0.8,0.6,0.7,1.0],[0.8,0.6,0.7,1.0]);
    Renderer.stack.pop();

    // Wheels matrix
    Mw                 = glMatrix.mat4.create();
    /* draw the wheels */
    glMatrix.mat4.fromRotation(rotate_transform, Math.PI * 0.5, [0, 0, 1]);
    glMatrix.mat4.fromTranslation(translate_matrix,[1,0,0]);
    glMatrix.mat4.mul(Mw,translate_matrix,rotate_transform);
    
    glMatrix.mat4.fromScaling(scale_matrix,[0.1,0.2,0.2]);
    glMatrix.mat4.mul(Mw,scale_matrix,Mw);
     /* now the diameter of the wheel is 2*0.2 = 0.4 and the wheel is centered in 0,0,0 */

    speedWheelAngle += Renderer.car.speed;
    if(speedWheelAngle > Math.PI * 2){ //una rotazione di K*Pi = rotazione di Pi
      speedWheelAngle -= Math.PI * 2;
    }else if (speedWheelAngle < - (Math.PI * 2)){
      speedWheelAngle += Math.PI * 2;
    } 
    speedBasedRotationMatrix = glMatrix.mat4.create();
    glMatrix.mat4.fromRotation(speedBasedRotationMatrix, speedWheelAngle, [-1, 0, 0]);
    glMatrix.mat4.mul(Mw, speedBasedRotationMatrix, Mw);
    
    frontWheelRotationMatrix = glMatrix.mat4.create();
    // Create a rotation matrix that rotates the wheels along the y axis of Renderer.car.wheelsAngle radians
    glMatrix.mat4.fromRotation(frontWheelRotationMatrix, Renderer.car.wheelsAngle * 2, [0, 1, 0]); //il *2 perchè si vede meglio

    
    glMatrix.mat4.identity(M);
    
    // draw front wheels
    glMatrix.mat4.fromTranslation(translate_matrix,[-0.8,0.2,-0.7]);
    glMatrix.mat4.mul(M, frontWheelRotationMatrix, Mw)
    glMatrix.mat4.mul(M, translate_matrix, M);

    Renderer.stack.push();
    Renderer.stack.multiply(M);
    gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, this.stack.matrix);
  
    this.drawObject(gl,this.cylinder,[1.0,0.6,0.5,1.0],[0.0,0.0,0.0,1.0]);
    Renderer.stack.pop();

    glMatrix.mat4.fromTranslation(translate_matrix,[0.8,0.2,-0.7]);
    glMatrix.mat4.mul(M, frontWheelRotationMatrix, Mw)
    glMatrix.mat4.mul(M,translate_matrix,M);

    Renderer.stack.push();
    Renderer.stack.multiply(M);
    gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, this.stack.matrix); 
    this.drawObject(gl,this.cylinder,[1.0,0.6,0.5,1.0],[0.0,0.0,0.0,1.0]);
    Renderer.stack.pop();

    /* this will increase the size of the wheel to 0.4*1,5=0.6 */
    // draw rear wheels
    glMatrix.mat4.fromScaling(scale_matrix,[1,1.5,1.5]);;
    glMatrix.mat4.mul(Mw,scale_matrix,Mw);
    
    glMatrix.mat4.fromTranslation(translate_matrix,[0.8,0.25,0.7]);
    glMatrix.mat4.mul(M,translate_matrix,Mw);
  
    Renderer.stack.push();
    Renderer.stack.multiply(M);
    gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, this.stack.matrix); 
    Renderer.stack.pop();

    this.drawObject(gl,this.cylinder,[1.0,0.6,0.5,1.0],[0.0,0.0,0.0,1.0]);

    glMatrix.mat4.fromTranslation(translate_matrix,[-0.8,0.3,0.7]);
    glMatrix.mat4.mul(M,translate_matrix,Mw);
  
    Renderer.stack.push();
    Renderer.stack.multiply(M);
    gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, this.stack.matrix); 
    this.drawObject(gl,this.cylinder,[1.0,0.6,0.5,1.0],[0.0,0.0,0.0,1.0]);
    Renderer.stack.pop();
};


Renderer.drawScene = function (gl) {

  var width = this.canvas.width;
  var height = this.canvas.height
  var ratio = width / height;
  this.stack = new MatrixStack();

  gl.viewport(0, 0, width, height);
  
  gl.enable(gl.DEPTH_TEST);

  // Clear the framebuffer
  gl.clearColor(0.34, 0.5, 0.74, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  gl.useProgram(this.uniformShader);
  
  gl.uniformMatrix4fv(this.uniformShader.uProjectionMatrixLocation, false, glMatrix.mat4.perspective(glMatrix.mat4.create(), 3.14 / 4, ratio, 1, 500));

  Renderer.cameras[Renderer.currentCamera].update(this.car.frame);
  var invV = Renderer.cameras[Renderer.currentCamera].matrix();

  //PHONG
  inverseViewMatrix = glMatrix.mat4.create(); //view matrix
  glMatrix.mat4.invert(inverseViewMatrix, invV); //calcolo l'inversa della view matrix
  viewSpaceLightDirection = glMatrix.vec4.create(); //direzione della luce in view space, che si ottiene moltiplicando l'inversa del view matrix con il vettore 
  tmpDirection = Game.scene.weather.sunLightDirection; //serve un vettore a 4 componenti
  tmpDirection[3] = 0; //metto la 4a componente a 0 (vettore)
  glMatrix.vec4.transformMat4(viewSpaceLightDirection, tmpDirection, invV); //moltiplica la matrice per il vettore
  glMatrix.vec4.normalize(viewSpaceLightDirection, viewSpaceLightDirection);
  gl.uniform3fv(this.uniformShader.uViewSpaceLightDirectionLocation, viewSpaceLightDirection.subarray(0,3)); //inserisce il valore nello shader

  //console.log(viewSpaceLightDirection);

  //passo i lampioni allo shader
  var spotlights = []; //line 304
    //prima creo una matrice per inserire i vettori da passare allo shader e li trasformo in VS
  for(var i = 0; i < Game.scene.lamps.length; i++){
    var vsSpotlight = glMatrix.vec3.transformMat4(
      glMatrix.vec3.create(),
      [
        Game.scene.lamps[i].position[0],
        Game.scene.lamps[i].height,
        Game.scene.lamps[i].position[2]
      ],
      invV
    );
    spotlights[i * 3 + 0] = vsSpotlight[0];
    spotlights[i * 3 + 1] = vsSpotlight[1];
    spotlights[i * 3 + 2] = vsSpotlight[2];
  }
  gl.uniform3fv(this.uniformShader.uSpotlightsLocation, spotlights); //passo allo shader

  gl.uniformMatrix4fv(this.uniformShader.uViewMatrixLocation, false, invV); //passo allo shader la View Matrix
  
  // initialize the stack with the identity
  this.stack.loadIdentity();
  // multiply by the view matrix
  this.stack.multiply(invV);

  // drawing the car
  this.stack.push();
  this.stack.multiply(this.car.frame); // projection * viewport
  //gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, stack.matrix);
  this.drawCar(gl);
  this.stack.pop();

  gl.uniformMatrix4fv(this.uniformShader.uModelViewMatrixLocation, false, this.stack.matrix);

  // drawing the static elements (ground, track and buldings)
	this.drawObject(gl, Game.scene.groundObj, [0.3, 0.7, 0.2, 1.0], [0, 0, 0, 1.0]);
 	this.drawObject(gl, Game.scene.trackObj, [0.9, 0.8, 0.7, 1.0], [0, 0, 0, 1.0]);
	for (var i in Game.scene.buildingsObj) 
		this.drawObject(gl, Game.scene.buildingsObj[i], [0.8, 0.8, 0.8, 1.0], [0.2, 0.2, 0.2, 1.0]);
	gl.useProgram(null);
};



Renderer.Display = function () {
  Renderer.drawScene(Renderer.gl);
  window.requestAnimationFrame(Renderer.Display) ;
};


Renderer.setupAndStart = function () {
 /* create the canvas */
	Renderer.canvas = document.getElementById("OUTPUT-CANVAS");
  
 /* get the webgl context */
	Renderer.gl = Renderer.canvas.getContext("webgl");

  /* read the webgl version and log */
	var gl_version = Renderer.gl.getParameter(Renderer.gl.VERSION); 
	log("glversion: " + gl_version);
	var GLSL_version = Renderer.gl.getParameter(Renderer.gl.SHADING_LANGUAGE_VERSION)
	log("glsl  version: "+GLSL_version);

  /* create the matrix stack */
	Renderer.stack = new MatrixStack();

  /* initialize objects to be rendered */
  Renderer.initializeObjects(Renderer.gl);

  /* create the shader */
  Renderer.uniformShader = new uniformShader(Renderer.gl);

  /*
  add listeners for the mouse / keyboard events
  */
  Renderer.canvas.addEventListener('mousemove',on_mouseMove,false);
  Renderer.canvas.addEventListener('keydown',on_keydown,false);
  Renderer.canvas.addEventListener('keyup',on_keyup,false);

  Renderer.Display();
}

on_mouseMove = function(e){}

on_keyup = function(e){
	Renderer.car.control_keys[e.key] = false;
}
on_keydown = function(e){
	Renderer.car.control_keys[e.key] = true;
}

window.onload = Renderer.setupAndStart;


update_camera = function (value){
  Renderer.currentCamera = value;
}
