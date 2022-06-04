skyboxShader = function (gl) {
	var vertexShaderSource = glsl`
		uniform   mat4 uViewMatrix;
		uniform   mat4 uProjectionMatrix;
		attribute vec3 aPosition;
		varying vec3 vpos; //posizione obj space
		void main(void)	{
			vpos = normalize(aPosition);
			//l'obj space coincide con il world, sei al centro
			gl_Position = uProjectionMatrix * vec4((uViewMatrix * vec4(aPosition, 0.0)).xyz,1.0); //0.0 ignora la traslazione della view matrix, lo rimette a 1 perchè è una posizione
		}`;
		
	var fragmentShaderSource = glsl`
		precision highp float;
		uniform  samplerCube  uSamplerCM; //una texture composta da 6 immagini
		varying vec3 vpos;
		
		void main(void)	{
 			gl_FragColor = textureCube (uSamplerCM,normalize(vpos));
		} `;
	// create the vertex shader
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexShaderSource);
	gl.compileShader(vertexShader);

	// create the fragment shader
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, fragmentShaderSource);
	gl.compileShader(fragmentShader);

	// Create the shader program

	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	
	shaderProgram.aPositionIndex = 0;
	
	gl.bindAttribLocation(shaderProgram,shaderProgram. aPositionIndex, "aPosition");
	gl.linkProgram(shaderProgram);
  
	// If creating the shader program failed, alert
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		var str = "Unable to initialize the shader program.\n\n";
		str += "VS:\n"   + gl.getShaderInfoLog(vertexShader)   + "\n\n";
		str += "FS:\n"   + gl.getShaderInfoLog(fragmentShader) + "\n\n";
		str += "PROG:\n" + gl.getProgramInfoLog(shaderProgram);
		alert(str);
	}
	
	shaderProgram.uViewMatrixLocation 	= gl.getUniformLocation(shaderProgram, "uViewMatrix");
	shaderProgram.uProjectionMatrixLocation 	= gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
	shaderProgram.uSamplerCMLocation		= gl.getUniformLocation(shaderProgram, "uSamplerCM");
	
	
	
	return shaderProgram;
};

