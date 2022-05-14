const glsl = x => x; //plugin vscode

uniformShader = function (gl) {//line 1,Listing 2.14
  var vertexShaderSource = glsl` //syntax highlighting
    uniform   mat4 uModelViewMatrix;
    uniform   mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;

    //PHONG
    //uniform   vec3 uViewSpaceLightDirection;

    
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    
    varying vec3 vViewSpaceNormal; //normale in view space
    varying vec3 vViewSpaceViewDirection;
    varying vec3 vPosVS; //posizione punto 
    varying vec3 vVSSpotlightDirection;


    void main(void){
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
      vViewSpaceNormal = normalize(uModelViewMatrix * vec4(aNormal, 0.0)).xyz;
      vViewSpaceViewDirection = -normalize(uModelViewMatrix * vec4(aPosition, 1.0)).xyz;
      vPosVS = (uModelViewMatrix * vec4(aPosition, 1.0)).xyz; //posizione in VS
      
      //calcolo la direzione dei faretti in VS
      //line 28
      vVSSpotlightDirection = normalize(uViewMatrix * vec4(0.0, -1.0, 0.0, 0.0)).xyz;
    }
  `;

  var fragmentShaderSource = glsl`
    precision highp float;
    uniform vec4 uColor;
    //PHONG
    uniform vec3 uViewSpaceLightDirection;
    varying vec3 vViewSpaceNormal; //normale in view space
    varying vec3 vViewSpaceViewDirection;
    varying vec3 vPosVS;

    //spotlights
    uniform vec3 uSpotlights[12];
    varying vec3 vVSSpotlightDirection;


    void main(void){
      //gl_FragColor = vec4(uColor) * vec4(normalize(uViewSpaceLightDirection), 1);
      //gl_FragColor = ;
      //gl_FragColor.a = 1.0;
      float diffuseLight = max(dot(uViewSpaceLightDirection, vViewSpaceNormal), 0.0) * 0.5 + 0.5; //0,4: la componente diffusiva è almeno 0,4. 0,5: non è troppo bassa
      vec3 diffuseColor = uColor.xyz * diffuseLight;
      
      vec3 reflectedLightDirection = -uViewSpaceLightDirection + 2.0 * dot(uViewSpaceLightDirection, vViewSpaceNormal) * vViewSpaceNormal;
      float specularLight = max(0.0, pow(dot(vViewSpaceViewDirection, reflectedLightDirection), 1.0)); //10 shininess
      vec3 specularColor = uColor.xyz * specularLight;

      //spotlights
      float spotlightLight = 0.0;
      for(int i = 0; i < 12; i ++){
        float tmplight = 0.4;
        float cosangle = dot(normalize(vPosVS-uSpotlights[i]), vVSSpotlightDirection);
        //if(cosangle < 0.9){ //senza if non viene tagliato direttamente
          tmplight = tmplight * pow(cosangle, 10.0); //così la luce viene concentrata
        //}
        
        spotlightLight += tmplight;
      }
      vec3 spotlightColor = vec3(0.996, 0.698, 0.902) /*very cool colour*/ * spotlightLight;

      gl_FragColor = vec4(diffuseColor + specularColor + spotlightColor, 1.0);

      //gl_FragColor = vec4(spotlightLight /12.0, 0.0, 0.0, 1.0);
    }
  `;

  // create the vertex shader
  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);

  // create the fragment shader
  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);

  // Create the shader program
  var aPositionIndex = 0;
  var aNormalIndex = 1;
  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.bindAttribLocation(shaderProgram, aPositionIndex, "aPosition");
  gl.bindAttribLocation(shaderProgram, aNormalIndex, "aNormal");
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    var str = "Unable to initialize the shader program.\n\n";
    str += "VS:\n" + gl.getShaderInfoLog(vertexShader) + "\n\n";
    str += "FS:\n" + gl.getShaderInfoLog(fragmentShader) + "\n\n";
    str += "PROG:\n" + gl.getProgramInfoLog(shaderProgram);
    alert(str);
  }

  shaderProgram.aPositionIndex = aPositionIndex;
  shaderProgram.aNormalIndex = aNormalIndex;
  shaderProgram.uModelViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
  shaderProgram.uProjectionMatrixLocation = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
  shaderProgram.uColorLocation = gl.getUniformLocation(shaderProgram, "uColor");
  shaderProgram.uViewSpaceLightDirectionLocation = gl.getUniformLocation(shaderProgram, "uViewSpaceLightDirection");
  shaderProgram.uViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uViewMatrix");

  //spotlights
  shaderProgram.uSpotlightsLocation = gl.getUniformLocation(shaderProgram, "uSpotlights");

  return shaderProgram;
};//line 55
//line 56 ;)
