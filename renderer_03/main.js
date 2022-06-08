



/*
the FollowFromUpCamera always look at the car from a position above right over the car
*/
FollowFromUpCamera = function(){

  /* the only data it needs is the position of the camera */
  this.frame = glMatrix.mat4.create();
  
  /* update the camera with the current car position */
  this.update = function(car_position){
    this.frame = car_position; //coordinate mondo
  }

  /* return the transformation matrix to transform from world coordinates to the view reference frame */
  this.matrix = function(){ //view frame

    //obj space:
    let eye = glMatrix.vec3.create();
    let target = glMatrix.vec3.create();
    let up = glMatrix.vec4.create(); //up vector per la matrice lookat
    
    //trasforma in coordinate mondo, moltiplica per il frame
    glMatrix.vec3.transformMat4(eye, [0, 30, 0], this.frame);
    glMatrix.vec3.transformMat4(target, [0.0,0.0,0.0,1.0], this.frame); //vado al centro del frame della macchina
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
    glMatrix.vec3.transformMat4(target, [0.0,1.0,0.0,1.0], this.frame);
    return glMatrix.mat4.lookAt(glMatrix.mat4.create(),eye, target,[0, 1, 0]);	
  }
}

//observer camera
ObserverCamera = function() {
  this.frame = glMatrix.mat4.create();

  //se ci stiamo muovendo lungo gli assi. Quando si premono i pulsanti qwasdz verranno settati a 1 o -1. Quando si rilasceranno si setteranno a 0
  this.xMovement = 0;
  this.yMovement = 0;
  this.zMovement = 0;
  this.mouseCoords = [0, 0];

  //origine del frame: in un angolo
  let translationOrigObserverMatrix = glMatrix.mat4.create();
  glMatrix.mat4.fromTranslation(translationOrigObserverMatrix, [-100, -30, -100]); //origine in un angolo
  glMatrix.mat4.mul(this.frame, translationOrigObserverMatrix, this.frame);
  let rotationOriginObserverMatrix = glMatrix.mat4.create();
  glMatrix.mat4.fromRotation(rotationOriginObserverMatrix, -Math.PI / 4, [0, 1, 0]); //rotazione intorno all'asse y
  glMatrix.mat4.mul(this.frame, rotationOriginObserverMatrix, this.frame);
  glMatrix.mat4.fromRotation(rotationOriginObserverMatrix, Math.PI / 8, [1, 0, 0]); //rotazione intorno all'asse z
  glMatrix.mat4.mul(this.frame, rotationOriginObserverMatrix, this.frame);

  
  this.update = function(cp){ //cp non verrà mai utilizzata, ma l'ho lasciata per non dover cambiare la dichiarazione della funzione update anche in chase e in follow from up
    let translationMatrix = glMatrix.mat4.create();
    glMatrix.mat4.fromTranslation(translationMatrix, [this.xMovement, this.yMovement, this.zMovement]); //quando premo un tasto, trasla del tasto che sto premendo
    glMatrix.mat4.mul(this.frame, translationMatrix, this.frame); //aggiorna il frame

    //rotazione con il mouse. Due rotazioni perchè lo spazio in cui si muove il mouse è bidimensionale
    let rotationMatrix = glMatrix.mat4.create();

    glMatrix.mat4.fromRotation(rotationMatrix, -this.mouseCoords[1] * 0.001, [1, 0, 0]); //angolo in radianti * asse, qui si usa l'asse x perchè per la regola della mano destra ciò che non cambia è l'asse x
    glMatrix.mat4.mul(this.frame, rotationMatrix, this.frame);
    glMatrix.mat4.fromRotation(rotationMatrix, -this.mouseCoords[0]* 0.001, [0, 1, 0]);
    glMatrix.mat4.mul(this.frame, rotationMatrix, this.frame);
  }

  /* return the transformation matrix to transform from worlod coordiantes to the view reference frame */
  this.matrix = function(){
    return this.frame;
  }
}


/* the main object to be implementd */
var Renderer = new Object();

/* array of cameras that will be used */
Renderer.cameras = [];
// add a FollowFromUpCamera
Renderer.cameras.push(new FollowFromUpCamera());
Renderer.cameras.push(new ChaseCamera());
Renderer.cameras.push(new ObserverCamera());

// set the camera currently in use
Renderer.currentCamera = 1; //chase

/*
create the buffers for an object as specified in common/shapes/triangle.js
*/
Renderer.createObjectBuffers = function (gl, obj) { //i buffer (gl.createBuffer) servono per passare i dati dei vertici alla GPU. Chiamata per ogni oggetto
  if(obj.name == "TriangleCar") return;
  ComputeNormals(obj);

  obj.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer); //bufferData si riferisce al vertexBuffer appena creato
  gl.bufferData(gl.ARRAY_BUFFER, obj.vertices, gl.STATIC_DRAW); //passa le posizioni
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  //creo buffer normali
  obj.normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, obj.normals, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  //creo buffer coordinate texture
  obj.texCoordsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.texCoordsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, obj.texCoords, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  obj.indexBufferTriangles = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferTriangles);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, obj.triangleIndices, gl.STATIC_DRAW); //indici tra i triangoli per la connettività
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
draw a Lamps in the position of each of the spotlight in the scene
*/
Renderer.drawLamps = function(gl, currentShader, invV, whatToDraw) {
  scaling_Matrix = glMatrix.mat4.create();
  translation_Matrix = glMatrix.mat4.create();
  M = glMatrix.mat4.create(); //model matrix, da oggetto a mondo
  ModelView = glMatrix.mat4.create(); //modelview, da oggetto a vista
  

  for (var i = 0; i < Game.scene.lamps.length; i++) {

    //disegno il piedistallo del lampione
    glMatrix.mat4.fromScaling(scaling_Matrix, [0.3, 2.0, 0.3]); //diminuisce il raggio e aumenta l'altezza
    glMatrix.mat4.mul(M, scaling_Matrix, M);
    glMatrix.mat4.fromTranslation(translation_Matrix, Game.scene.lamps[i].position);
    glMatrix.mat4.mul(M, translation_Matrix, M);
    glMatrix.mat4.mul(ModelView, invV, M);
    gl.uniformMatrix4fv(currentShader.uModelViewMatrixLocation, false, ModelView); //passo la ModelView allo shader
    
    this.drawObject(gl, Game.scene.lampione, currentShader, [0.75, 0.75, 0.75, 1], [0.75, 0.75, 0.75, 1], false, whatToDraw);


    //disegno la parte sopra del lampione
    M = glMatrix.mat4.create();
    glMatrix.mat4.fromScaling(scaling_Matrix, [1.0, 0.2, 1.0]) //diminuisco l'altezza del cilindro
    glMatrix.mat4.mul(M, scaling_Matrix, M);
    posizione = Game.scene.lamps[i].position;
    posizione[1] = 4;
    glMatrix.mat4.fromTranslation(translation_Matrix, posizione); //setto l'altezza
    glMatrix.mat4.mul(M, translation_Matrix, M);
    glMatrix.mat4.mul(ModelView, invV, M);
    gl.uniformMatrix4fv(currentShader.uModelViewMatrixLocation, false, ModelView); //passo la modelview per disegnare il pezzo sopra del lampione
    this.drawObject(gl, Game.scene.lampione, currentShader, [0.75, 0.75, 0.75, 1], [0.75, 0.75, 0.75, 1], false, whatToDraw); //disegno il pezzo sopra del lampione



    M = glMatrix.mat4.create();
  }

  let m = glMatrix.mat4.create();
  glMatrix.mat4.fromRotation(m, Math.PI, [1,0,0]);
  let t = glMatrix.mat4.create();
  glMatrix.mat4.fromTranslation(t, [0, -1, 0]);
  glMatrix.mat4.mul(m, t, m);
  glMatrix.mat4.mul(m, invV, m);

  gl.uniformMatrix4fv(currentShader.uModelViewMatrixLocation, false, m);
  // drawing the static elements (ground, track and buildings)
  if(whatToDraw == 0) {
    this.gl.uniform1i(currentShader.uSamplerLocation, this.textures.groundColor); //carico la texture
    this.gl.uniform1i(currentShader.uHeadlightSamplerLocation, this.textures.headlightColor); //carico la texture
  }
	this.drawObject(gl, Game.scene.groundObj,currentShader, [0.3, 0.7, 0.2, 1.0], [0, 0, 0, 1.0], this.texturesEnabled, whatToDraw); //disegna ground
};



/*
draw an object as specified in common/shapes/triangle.js for which the buffer 
have alrady been created
*/
Renderer.drawObject = function (gl, obj, shader, fillColor, lineColor, textures = this.texturesEnabled, whatToDraw = 0) {

  gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
  gl.enableVertexAttribArray(shader.aPositionIndex); //slot attributi per passare i dati allo shader
  gl.vertexAttribPointer(shader.aPositionIndex, 3, gl.FLOAT, false, 0, 0); //definiamo la struttura dei dati contenuti nel buffer selezionato. un buffer per più attributi

  if(typeof obj.normals != 'undefined' && typeof shader.aNormalIndex != 'undefined'){ //se l'oggetto ha le normali e lo shader le ha gliele passo
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
    gl.enableVertexAttribArray(shader.aNormalIndex);
    gl.vertexAttribPointer(shader.aNormalIndex, 3, gl.FLOAT, false, 0, 0);
  }

  if(typeof obj.texCoords != 'undefined' && typeof shader.aTextureCoordsIndex != 'undefined'){
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.texCoordsBuffer);
    gl.enableVertexAttribArray(shader.aTextureCoordsIndex);
    gl.vertexAttribPointer(shader.aTextureCoordsIndex, 2, gl.FLOAT, false, 0, 0);
  }

  if(this.wireframeEnabled && whatToDraw == 0){ //abilita il wireframe risolvendo il z-fighting
    gl.enable(gl.POLYGON_OFFSET_FILL); //per lo z-fighting altrimenti non vedo le linee
    gl.polygonOffset(1.0, 1.0);
  }

  if(typeof shader.uTexturesEnabledLocation != 'undefined' && whatToDraw == 0){
    gl.uniform1i(shader.uTexturesEnabledLocation, textures ? 1 : 0);
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferTriangles); //per gli indici
  if(whatToDraw == 0) {
    gl.uniform4fv(shader.uColorLocation, fillColor);
  }
  gl.drawElements(gl.TRIANGLES, obj.triangleIndices.length, gl.UNSIGNED_SHORT, 0); //disegno i triangoli

  
  if(this.wireframeEnabled && whatToDraw == 0){
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.uniform4fv(shader.uColorLocation, lineColor);
    gl.uniform1i(shader.uTexturesEnabledLocation, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferEdges);
    gl.drawElements(gl.LINES, obj.numTriangles * 3 * 2, gl.UNSIGNED_SHORT, 0); //disegna i contorni dei triangoli
  }


  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  gl.disableVertexAttribArray(shader.aPositionIndex);
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
  this.createObjectBuffers(gl, this.cylinder);
  
  Renderer.createObjectBuffers(gl, this.triangle);

  Renderer.createObjectBuffers(gl, Game.scene.trackObj);
  Renderer.createObjectBuffers(gl, Game.scene.groundObj);

  Renderer.createObjectBuffers(gl, Game.scene.lampione); //crea obj buffer lampione

  for (var i = 0; i < Game.scene.buildings.length; ++i){
    Renderer.createObjectBuffers(gl, Game.scene.buildingsObjTex[i]);
    Renderer.createObjectBuffers(gl, Game.scene.buildingsObjTex[i].roof);
  }



  //oggetto che tiene traccia delle associazioni per le textures
  Renderer.textures = {
    trackColor: 0,
    facadeColor: 1,
    roofColor: 2,
    groundColor: 3,
    headlightColor: 4,
    skybox: 5,
    //shadow map
    headlightDx: 6,
    headlightSx: 7
  }
  this.loadTexture(this.textures.facadeColor, "../common/textures/facade2.jpg");
  this.loadTexture(this.textures.roofColor, "../common/textures/roof.jpg");
  this.loadTexture(this.textures.groundColor, "../common/textures/grass_tile.png");
  this.loadTexture(this.textures.trackColor, "../common/textures/street4.png");
  this.loadTexture(this.textures.headlightColor, "../common/textures/headlight.png", this.gl.CLAMP_TO_EDGE);
  
  //skybox
  this.textureCubeMap = this.createCubeMap(this.textures.skybox, this.gl, 
    "../common/textures/cubemap/posx.jpg",
    "../common/textures/cubemap/negx.jpg",
    "../common/textures/cubemap/posy.jpg",
    "../common/textures/cubemap/negy.jpg",
    "../common/textures/cubemap/posz.jpg",
    "../common/textures/cubemap/negz.jpg");
    
};


speedWheelAngle = 0; //velocità ruote
/*
draw the car
*/
Renderer.drawCar = function (gl, currentShader, whatToDraw) {

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
    gl.uniformMatrix4fv(currentShader.uModelViewMatrixLocation, false, this.stack.matrix);

    this.drawObject(gl,this.cube, currentShader, [0.8,0.6,0.7,1.0], [0, 0, 0, 1], false, whatToDraw);
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

    speedWheelAngle += Renderer.car.speed; //aumenta l'angolo di rotazione con l'aumentare della velocità della macchina
    if(speedWheelAngle > Math.PI * 2){ //una rotazione di K*Pi = rotazione di Pi
      speedWheelAngle -= Math.PI * 2; //è inutile che questo numero diventi troppo grande
    }else if (speedWheelAngle < - (Math.PI * 2)){
      speedWheelAngle += Math.PI * 2;
    } 
    speedBasedRotationMatrix = glMatrix.mat4.create();
    glMatrix.mat4.fromRotation(speedBasedRotationMatrix, speedWheelAngle, [-1, 0, 0]); //rotazione ruote
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
    gl.uniformMatrix4fv(currentShader.uModelViewMatrixLocation, false, this.stack.matrix);
  
    this.drawObject(gl,this.cylinder,currentShader,[1.0,0.6,0.5,1.0],[0.0,0.0,0.0,1.0], false, whatToDraw); //non disegna la texture
    Renderer.stack.pop();

    glMatrix.mat4.fromTranslation(translate_matrix,[0.8,0.2,-0.7]);
    glMatrix.mat4.mul(M, frontWheelRotationMatrix, Mw)
    glMatrix.mat4.mul(M,translate_matrix,M);

    Renderer.stack.push();
    Renderer.stack.multiply(M);
    gl.uniformMatrix4fv(currentShader.uModelViewMatrixLocation, false, this.stack.matrix); 
    this.drawObject(gl,this.cylinder,currentShader,[1.0,0.6,0.5,1.0],[0.0,0.0,0.0,1.0], false, whatToDraw); //non disegna la texture
    Renderer.stack.pop();

    /* this will increase the size of the wheel to 0.4*1,5=0.6 */
    // draw rear wheels
    glMatrix.mat4.fromScaling(scale_matrix,[1,1.5,1.5]);;
    glMatrix.mat4.mul(Mw,scale_matrix,Mw);
    
    glMatrix.mat4.fromTranslation(translate_matrix,[0.8,0.25,0.7]);
    glMatrix.mat4.mul(M,translate_matrix,Mw);
  
    Renderer.stack.push();
    Renderer.stack.multiply(M);
    gl.uniformMatrix4fv(currentShader.uModelViewMatrixLocation, false, this.stack.matrix); 
    Renderer.stack.pop();

    this.drawObject(gl,this.cylinder,currentShader,[1.0,0.6,0.5,1.0],[0.0,0.0,0.0,1.0], false, whatToDraw); //non disegna la texture

    glMatrix.mat4.fromTranslation(translate_matrix,[-0.8,0.3,0.7]);
    glMatrix.mat4.mul(M,translate_matrix,Mw);
  
    Renderer.stack.push();
    Renderer.stack.multiply(M);
    gl.uniformMatrix4fv(currentShader.uModelViewMatrixLocation, false, this.stack.matrix); 
    this.drawObject(gl,this.cylinder,currentShader,[1.0,0.6,0.5,1.0],[0.0,0.0,0.0,1.0], false, whatToDraw); //non disegna la texture
    Renderer.stack.pop();
};

// skybox
// Load cubemaps
setCubeFace = function (gl, texture, face, imgdata) { //mette i dati di un'immagine in una delle facce
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgdata);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}

loadCubeFace = function (gl, texture, face, path) { //carica una delle immagini e la passa a setCubeFace
  var imgdata = new Image();
  imgdata.onload = function () {
    setCubeFace(gl, texture, face, imgdata);
  }
  imgdata.src = path;
}

Renderer.createCubeMap = function (tu,gl, posx, negx, posy, negy, posz, negz) { //funzione da chiamare per la cubemap (skybox in questo caso)
  texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0+tu);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);	

  if(typeof posx !='undefined'){ //usa una texture che ho
    loadCubeFace(gl, texture, gl.TEXTURE_CUBE_MAP_POSITIVE_X, posx);
    loadCubeFace(gl, texture, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, negx);
    loadCubeFace(gl, texture, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, posy);
    loadCubeFace(gl, texture, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, negy);
    loadCubeFace(gl, texture, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, posz);
    loadCubeFace(gl, texture, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, negz);
  }else{ //crea una texture per farci rendering
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X,		0, 	gl.RGBA, 512,512,0,	gl.RGBA, 	gl.UNSIGNED_BYTE,null);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 	0, 	gl.RGBA, 512,512,0,	gl.RGBA, 	gl.UNSIGNED_BYTE,null);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 	0, 	gl.RGBA, 512,512,0,	gl.RGBA, 	gl.UNSIGNED_BYTE,null);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 	0, 	gl.RGBA, 512,512,0,	gl.RGBA, 	gl.UNSIGNED_BYTE,null);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 	0, 	gl.RGBA, 512,512,0,	gl.RGBA, 	gl.UNSIGNED_BYTE,null);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 	0, 	gl.RGBA, 512,512,0,	gl.RGBA, 	gl.UNSIGNED_BYTE,null)	
  }


  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

  return texture;
}

Renderer.createFramebuffer = function(gl, right, whatToDraw){ //crea un framebuffer per farci rendering dentro
  var width = this.canvas.width * 2;
  var height = this.canvas.height * 2;
  var ratio = width / height;
  //alert(gl.MAX_TEXTURE_IMAGE_UNITS - gl.TEXTURE0);

  //framebuffer shadow map
  gl.activeTexture(gl.TEXTURE0 + (right ? this.textures.headlightDx : this.textures.headlightSx)); //mette all'interno delle texture giuste il rendering dei faretti
  targetTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, targetTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  

  framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); //bind, gl disegna su quel framebuffer
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0); //associo texture al colore (COLOR_ATTACHMENT0) di quel framebuffer, il colore va sul framebuffer

  depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

  //shadow map faretti
  if(right){
    this.headlightDxTexture = targetTexture;
    this.headlightDxFramebuffer = framebuffer;
  }else{
    this.headlightSxTexture = targetTexture;
    this.headlightSxFramebuffer = framebuffer;
  }
}

Renderer.drawScene = function (gl, whatToDraw) {
  /*
  whatToDraw = 0 => render scena
  whatToDraw = 1 => render faro sinistro (shadow map)
  whatToDraw = 2 => render faro destro (shadow map)
  */

  var width;
  var height;
  if(whatToDraw != 0){ //sto facendo il render di uno dei due faretti
    if(typeof Renderer.headlightDxTexture == 'undefined'){ //se è il primo che sto facendo creo i framebuffer
      this.createFramebuffer(gl, true, whatToDraw)
      this.createFramebuffer(gl, false, whatToDraw)
    }

    if(whatToDraw == 1){ //disegna sul framebuffer sx
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.headlightSxFramebuffer); //bind, gl disegna su quel framebuffer
    }else{ //disegna sul framebuffer dx
      //gl.bindFramebuffer(gl.FRAMEBUFFER, null); //bind, gl disegna su quel framebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.headlightDxFramebuffer); //bind, gl disegna su quel framebuffer
    }
    gl.clearColor(1, 1, 1, 1.0); //definisce il colore desiderato (canvas)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); //pulisce lo schermo
    gl.enable(gl.CULL_FACE)
		gl.cullFace(gl.FRONT)
    width = this.canvas.width * 2;
    height = this.canvas.height * 2;
  }else{ //disegna sul canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // Clear the framebuffer
    gl.clearColor(0.34, 0.5, 0.74, 1.0); //definisce il colore desiderato (canvas)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); //pulisce lo schermo
    gl.enable(gl.CULL_FACE)
		gl.cullFace(gl.BACK)
    width = this.canvas.width;
    height = this.canvas.height;
  }
  var ratio = width / height;

  this.stack = new MatrixStack();

  gl.viewport(0, 0, width, height); //dove disegno
  
  gl.enable(gl.DEPTH_TEST); //z-buffer


  var skyboxProjectionMatrix; //matrice di proiezione della skybox
  var projectionMatrix;
  if(whatToDraw == 0) {
    Renderer.cameras[Renderer.currentCamera].update(this.car.frame);
    var invV = Renderer.cameras[Renderer.currentCamera].matrix(); //view matrix
    skyboxProjectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), Math.PI / 4, ratio, 0.1, 500);
    //const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), Math.PI / 4 + Game.cars[0].speed, ratio, 1, 500);
    projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), Math.PI / 4, ratio, 0.1, 300);
  } else if(whatToDraw == 1) { //rendering faro sinistro
    var invV = Game.cars[0].headlightSxMatrix; //matrice di vista
    //const projectionMatrix = 
    projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), Math.PI / 4, 1, 0.1, 300); //proiezione prospettica headlights
  }else if(whatToDraw == 2) { //rendering faro destro
    var invV = Game.cars[0].headlightDxMatrix; //matrice di vista
    projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), Math.PI / 4, 1, 0.1, 300); //proiezione prospettica headlights
  }

  if(Renderer.skyboxEnabled && whatToDraw == 0){ //disegna la skybox solo se facciamo il render della scena, non dei faretti (sprechiamo solo calcoli altrimenti)
    this.drawSkybox(skyboxProjectionMatrix, invV);
  }
  
  gl.depthMask(true); //depth buffer
  let currentShader = whatToDraw == 0 ? this.uniformShader : this.shadowmapShader; //decide lo shader da utilizzare
  //currentShader = this.shadowMapShader;
  gl.useProgram(currentShader);


  gl.uniformMatrix4fv(currentShader.uProjectionMatrixLocation, false, projectionMatrix); //passa allo shader

  //headlights, passo allo shader le matrici dei fari
  if(whatToDraw == 0) {
    //shadow map
    this.gl.uniform1i(currentShader.uHeadlightSxLocation, this.textures.headlightSx); //carico la texture rendering faretto sx
    this.gl.uniform1i(currentShader.uHeadlightDxLocation, this.textures.headlightDx); //carico la texture rendering faretto dx

    gl.uniformMatrix4fv(currentShader.uHeadlightSxMatrixLocation, false, glMatrix.mat4.mul(glMatrix.mat4.create(), projectionMatrix, Game.cars[0].headlightSxMatrix)); //passo allo shader la matrice sx dei fari
    gl.uniformMatrix4fv(currentShader.uHeadlightDxMatrixLocation, false, glMatrix.mat4.mul(glMatrix.mat4.create(), projectionMatrix, Game.cars[0].headlightDxMatrix)); //passo allo shader la matrice dx dei fari
  

    //PHONG
    inverseViewMatrix = glMatrix.mat4.create(); //inversa view matrix
    glMatrix.mat4.invert(inverseViewMatrix, invV); //calcolo l'inversa della view matrix
    gl.uniformMatrix4fv(currentShader.uInverseViewMatrixLocation, false, inverseViewMatrix); //passo l'inversa della view matrix allo shader per calcolare la model matrix
    viewSpaceLightDirection = glMatrix.vec4.create(); //direzione della luce in view space, che si ottiene moltiplicando l'inversa del view matrix con il vettore 
    tmpDirection = Game.scene.weather.sunLightDirection; //serve un vettore a 4 componenti
    tmpDirection[3] = 0; //metto la 4a componente a 0 (vettore)
    glMatrix.vec4.transformMat4(viewSpaceLightDirection, tmpDirection, invV); //moltiplica la matrice per il vettore
    glMatrix.vec4.normalize(viewSpaceLightDirection, viewSpaceLightDirection);
    gl.uniform3fv(currentShader.uViewSpaceLightDirectionLocation, viewSpaceLightDirection.subarray(0,3)); //passa allo shader la direzione che in view space
  
    //console.log(viewSpaceLightDirection);

    //passo i lampioni allo shader
    var spotlights = []; //line 304
      //prima creo una matrice per inserire i vettori da passare allo shader e li trasformo in VS
    for(var i = 0; i < Game.scene.lamps.length; i++){ //per ogni faretto
      var vsSpotlight = glMatrix.vec3.transformMat4( 
        glMatrix.vec3.create(),
        [ //vettore
          Game.scene.lamps[i].position[0], //x
          Game.scene.lamps[i].height, //y altezza
          Game.scene.lamps[i].position[2] //z
        ],
        invV
      );
      spotlights[i * 3 + 0] = vsSpotlight[0];
      spotlights[i * 3 + 1] = vsSpotlight[1];
      spotlights[i * 3 + 2] = vsSpotlight[2];

    }
    gl.uniform3fv(currentShader.uSpotlightsLocation, spotlights); //passo allo shader
  }

  this.drawLamps(gl, currentShader, invV, whatToDraw); //disegna i lampioni


  gl.uniformMatrix4fv(currentShader.uViewMatrixLocation, false, invV); //passo allo shader la View Matrix
  
  // initialize the stack with the identity
  this.stack.loadIdentity();
  // multiply by the view matrix
  this.stack.multiply(invV);

  // drawing the car
  this.stack.push();
  this.stack.multiply(this.car.frame); // projection * viewport
  //gl.uniformMatrix4fv(currentShader.uModelViewMatrixLocation, false, stack.matrix);
  this.drawCar(gl, currentShader, whatToDraw);

  this.stack.pop();

  gl.uniformMatrix4fv(currentShader.uModelViewMatrixLocation, false, this.stack.matrix);


  // drawing the static elements (ground, track and buildings)
  if(whatToDraw == 0) {
    this.gl.uniform1i(currentShader.uSamplerLocation, this.textures.groundColor); //carico la texture
    this.gl.uniform1i(currentShader.uHeadlightSamplerLocation, this.textures.headlightColor); //carico la texture
  }
	this.drawObject(gl, Game.scene.groundObj,currentShader, [0.3, 0.7, 0.2, 1.0], [0, 0, 0, 1.0], this.texturesEnabled, whatToDraw); //disegna ground

  //texture track
  if(whatToDraw == 0) {
    this.gl.uniform1i(currentShader.uSamplerLocation, this.textures.trackColor); //carico la texture
  }
  this.drawObject(gl, Game.scene.trackObj,currentShader, [0.9, 0.8, 0.7, 1.0], [0, 0, 0, 1.0], this.texturesEnabled, whatToDraw); //disegna track
	for (var i in Game.scene.buildingsObjTex){
    if(whatToDraw == 0) {
      this.gl.uniform1i(currentShader.uSamplerLocation, this.textures.facadeColor); //carico la texture
    }
    this.drawObject(gl, Game.scene.buildingsObjTex[i],currentShader, [0.8, 0.8, 0.8, 1.0], [0.2, 0.2, 0.2, 1.0], this.texturesEnabled, whatToDraw); //disegna l'i-esimo building
    if(whatToDraw == 0) {
      this.gl.uniform1i(currentShader.uSamplerLocation, this.textures.roofColor); //carico la texture
    }
    this.drawObject(gl, Game.scene.buildingsObjTex[i].roof,currentShader, [0.8, 0.8, 0.8, 1.0], [0.2, 0.2, 0.2, 1.0], this.texturesEnabled, whatToDraw); //soffitto
  }
	gl.useProgram(null);
};

//skybox
Renderer.drawSkybox = function(projT,viewT){
  var gl = this.gl
  gl.useProgram(this.skyboxShader);
  gl.uniformMatrix4fv(this.skyboxShader.uProjectionMatrixLocation,false,projT);
  gl.uniformMatrix4fv(this.skyboxShader.uViewMatrixLocation,false,viewT);
  
  gl.activeTexture(gl.TEXTURE0 + this.textures.skybox);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP,this.textureCubeMap);
  gl.uniform1i(this.skyboxShader.uSamplerCMLocation, this.textures.skybox);
  
  gl.depthMask(false);
  this.drawObject(gl, this.cube,this.skyboxShader,[1, 0, 0, 0], [1, 0, 0, 0]);
}



Renderer.Display = function () { //per ogni frame
  Renderer.drawScene(Renderer.gl, 1);
  Renderer.drawScene(Renderer.gl, 2);
  Renderer.drawScene(Renderer.gl, 0);
  window.requestAnimationFrame(Renderer.Display);
};


Renderer.setupAndStart = function () { //chiamata durante il caricamento della pagina

  //attiva di default le textures
  document.getElementById("textures").checked = true;
  Renderer.texturesEnabled = true;


  update_camera(1); //camera di default: chase. Così vengono disabilitate di default le istruzioni per la observer
  
  //attiva di default la skybox
  document.getElementById("skybox").checked = true;
  Renderer.skyboxEnabled = true;

  //se attivo il wireframe, si disattivano le textures
  document.getElementById('wireframe').onclick = function() {
    document.getElementById("textures").checked = false;
    Renderer.texturesEnabled = false;
  }

  //se attivo le textures, si disattiva il wireframe
  document.getElementById('textures').onclick = function() {
    document.getElementById("wireframe").checked = false;
    Renderer.wireframeEnabled = false;
  }


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

  /* create the shaders */
  Renderer.uniformShader = new uniformShader(Renderer.gl);
  Renderer.skyboxShader = new skyboxShader(Renderer.gl);
  Renderer.shadowmapShader = new shadowMapShader(Renderer.gl);

  /*
  add listeners for the mouse / keyboard events
  */
  Renderer.canvas.addEventListener('mousemove',on_mouseMove,false);
  Renderer.canvas.addEventListener('keydown',on_keydown,false);
  Renderer.canvas.addEventListener('keyup',on_keyup,false);
  Renderer.canvas.addEventListener('mouseup',on_mouseup,false);
  Renderer.canvas.addEventListener('mousedown',on_mousedown,false);

  Renderer.Display();
}

Renderer.loadTexture = function(tu, url, wrappingMode = this.gl.REPEAT){ //carica una texture 
	var gl = this.gl
  var image = new Image(); //immagine javascript HTMLImageElement
	image.src = url;
	image.addEventListener('load',function(){	//dopo che ha caricato, esegue la funzione
		gl.activeTexture(gl.TEXTURE0 + tu); //parte da un indice e ci aggiunge un offset
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture); //diciamo ad opengl di utilizzare la texture per le primitive da ora in poi
    //uso la texture appena creata
		gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image); //mette i dati dell'immagine nella texture
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,wrappingMode); //u
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,wrappingMode); //v
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); //filtro magnification
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR); //filtro minification
		gl.generateMipmap(gl.TEXTURE_2D);
	});
}

movingMouse = false; //se sto muovendo il mouse (observer view)
absoluteMouseCoords = [0,0]; //coordinate assolute quando inizi a cliccare il mouse

on_mouseup = function(e) {
  movingMouse = false;
  Renderer.cameras[Renderer.currentCamera].mouseCoords = [0,0]; //per evitare che si muova all'infinito
}

on_mousedown = function(e) {
  movingMouse = true;
  absoluteMouseCoords = [e.offsetX, e.offsetY];
}

on_mouseMove = function(e){
  if(movingMouse){
    let newCoords = [e.offsetX, e.offsetY];
    Renderer.cameras[Renderer.currentCamera].mouseCoords = [ //differenza tra le coordinate assolute che erano state segnate a dove hai mosso il mouse
      newCoords[0] - absoluteMouseCoords[0],
      newCoords[1] - absoluteMouseCoords[1]
    ];
    absoluteMouseCoords = newCoords;
  }
}

on_keyup = function(e){
  if(Renderer.currentCamera == 2) { //se la modalità di vista è l'observer view
    switch(e.key) {
      case 'D':
      case 'd':
      case 'A':
      case 'a': {
        Renderer.cameras[Renderer.currentCamera].xMovement = 0;
        break;
      }
      case 'w':
      case 'W':
      case 'S':
      case 's': {
        Renderer.cameras[Renderer.currentCamera].zMovement = 0;
        break;
      }
      case 'q':
      case 'Q':
      case 'Z':
      case 'z': {
        Renderer.cameras[Renderer.currentCamera].yMovement = 0;
        break;
      }
    }
  } else { //chase camera/followfromup
	  Renderer.car.control_keys[e.key] = false;
  }
}


on_keydown = function(e){
  if(Renderer.currentCamera == 2) { //se la modalità di vista è l'observer view
    switch(e.key) {
      case 'D':
      case 'd': {
        Renderer.cameras[Renderer.currentCamera].xMovement = -1;
        break;
      }
      case 'A':
      case 'a': {
        Renderer.cameras[Renderer.currentCamera].xMovement = +1;
        break;
      }
      case 'W':
      case 'w': {
        Renderer.cameras[Renderer.currentCamera].zMovement = +1;
        break;
      }
      case 'S':
      case 's': {
        Renderer.cameras[Renderer.currentCamera].zMovement = -1;
        break;
      }
      case 'Q':
      case 'q': {
        Renderer.cameras[Renderer.currentCamera].yMovement = -1;
        break;
      }
      case 'Z':
      case 'z': {
        Renderer.cameras[Renderer.currentCamera].yMovement = +1;
        break;
      }
    }
  } else { //chase camera/followfromup
	  Renderer.car.control_keys[e.key] = true;
  }
}

window.onload = Renderer.setupAndStart;


update_camera = function (value){
  Renderer.currentCamera = value;

  //mostra/nasconde in automatico le istruzioni se si seleziona la observer view
  var div_instr = document.getElementById('instructions');
  if(value == 2) {
    div_instr.style.visibility = 'visible';
  } else {
    div_instr.style.visibility = 'hidden';
  }
}