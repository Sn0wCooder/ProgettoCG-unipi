const glsl = x => x; //plugin vscode

uniformShader = function (gl) {//line 1,Listing 2.14
  var vertexShaderSource = glsl` //syntax highlighting
    uniform   mat4 uModelViewMatrix;
    uniform   mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;

    //headlight
    uniform mat4 uInverseViewMatrix;

    //PHONG
    //uniform   vec3 uViewSpaceLightDirection;

    
    attribute vec3 aPosition; //posizione del vertice
    attribute vec3 aNormal;
    attribute vec2 aTextureCoords;
    
    varying vec3 vViewSpaceNormal; //normale in view space
    varying vec3 vViewSpaceViewDirection;
    varying vec3 vPosVS; //posizione punto 
    varying vec3 vVSSpotlightDirection;
    varying vec2 vTextureCoords;

    //coordinate in clip space headlights

    varying vec4 vPosition;


    void main(void){
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
      vViewSpaceNormal = normalize(uModelViewMatrix * vec4(aNormal, 0.0)).xyz;
      vViewSpaceViewDirection = -normalize(uModelViewMatrix * vec4(aPosition, 1.0)).xyz;
      vPosVS = (uModelViewMatrix * vec4(aPosition, 1.0)).xyz; //posizione in VS
      
      //calcolo la direzione dei faretti in VS
      //line 28
      vVSSpotlightDirection = normalize(uViewMatrix * vec4(0.0, -1.0, 0.0, 0.0)).xyz;

      vTextureCoords = aTextureCoords;
      //calcolo coordinate texture headlights

      mat4 modelMatrix = uInverseViewMatrix * uModelViewMatrix;

      vPosition = modelMatrix * vec4(aPosition, 1.0);
    }
  `;

  var fragmentShaderSource = glsl`
    precision highp float;
    uniform vec4 uColor;
    uniform sampler2D uSampler;
    uniform int uTexturesEnabled; //se le texture sono abilitate
    //PHONG
    uniform vec3 uViewSpaceLightDirection;
    varying vec3 vViewSpaceNormal; //normale in view space
    varying vec3 vViewSpaceViewDirection;
    varying vec3 vPosVS;
    varying vec2 vTextureCoords;

    //spotlights
    uniform vec3 uSpotlights[12];
    varying vec3 vVSSpotlightDirection;
    
    //coordinate texture headlights
    uniform sampler2D uHeadlightSampler;
    uniform mat4 uHeadlightDxMatrix;
    uniform mat4 uHeadlightSxMatrix;

    //shadow map
    uniform sampler2D uHeadlightSx;
    uniform sampler2D uHeadlightDx;

    varying vec4 vPosition;


    void main(void){
      //textures abilitate?
      vec3 color;
      if(uTexturesEnabled > 0){ //texture attivate
        color = texture2D(uSampler, vTextureCoords).xyz;
      }else{ //texture disattivate
        color = uColor.xyz;
      }
      
      //gl_FragColor = vec4(uColor) * vec4(normalize(uViewSpaceLightDirection), 1);
      //gl_FragColor = ;
      //gl_FragColor.a = 1.0;
      float diffuseLight = max(dot(uViewSpaceLightDirection, vViewSpaceNormal), 0.0) * 0.5 + 0.5; //0,4: la componente diffusiva è almeno 0,4. 0,5: non è troppo bassa
      vec3 diffuseColor = color * diffuseLight;
      
      vec3 reflectedLightDirection = -uViewSpaceLightDirection + 2.0 * dot(uViewSpaceLightDirection, vViewSpaceNormal) * vViewSpaceNormal;
      float specularLight = max(0.0, pow(dot(vViewSpaceViewDirection, reflectedLightDirection), 1.0)); //10 shininess
      vec3 specularColor = color * specularLight; //riflesso del colore delle texture






      vec4 vHeadlightDxTextureCoords = (uHeadlightDxMatrix * vPosition); //*0.8: ingrandisce la texture headlights
      vec4 vHeadlightSxTextureCoords = (uHeadlightSxMatrix * vPosition);

      vHeadlightDxTextureCoords /= vHeadlightDxTextureCoords.w; //divido per l'ultima componente per la proiezione prospettica
      vHeadlightSxTextureCoords /= vHeadlightSxTextureCoords.w;

      vHeadlightDxTextureCoords = vHeadlightDxTextureCoords * 0.5 + 0.5; //così le coordinate texture vanno da 0 a 1
      vHeadlightSxTextureCoords = vHeadlightSxTextureCoords * 0.5 + 0.5;

      //headlights
      vec4 headlightColorDx;
      if(vHeadlightDxTextureCoords.x >= 0.0 && vHeadlightDxTextureCoords.x <= 1.0 && vHeadlightDxTextureCoords.y >= 0.0 && vHeadlightDxTextureCoords.y <= 1.0){
        float depth = texture2D(uHeadlightDx, vHeadlightDxTextureCoords.xy).z; //shadow map
        if(depth + 0.005 > vHeadlightDxTextureCoords.z){ //se è minore ci metto il valore della texture (proietto il faretto)
          headlightColorDx = texture2D(uHeadlightSampler, vHeadlightDxTextureCoords.xy);
        }else{
          headlightColorDx = vec4(0.0,0.0,0.0,0.0);
        }
      }else{
        headlightColorDx = vec4(0.0,0.0,0.0,0.0);
      }

      vec4 headlightColorSx;
      if(vHeadlightSxTextureCoords.x >= 0.0 && vHeadlightSxTextureCoords.x <= 1.0 && vHeadlightSxTextureCoords.y >= 0.0 && vHeadlightSxTextureCoords.y <= 1.0){
        float depth = texture2D(uHeadlightSx, vHeadlightSxTextureCoords.xy).z; //shadow map
        if(depth + 0.005 > vHeadlightSxTextureCoords.z){ //se è minore ci metto il valore della texture (proietto il faretto)
          headlightColorSx = texture2D(uHeadlightSampler, vHeadlightSxTextureCoords.xy);
          //headlightColorSx = vHeadlightSxTextureCoords;
        }else{
          headlightColorSx = vec4(0.0,0.0,0.0,0.0);
        }
      }else{
        headlightColorSx = vec4(0.0,0.0,0.0,0.0);
      }

      //spotlights
      float spotlightLight = 0.0;
      for(int i = 0; i < 12; i ++){
        float tmplight = 0.4;
        float cosangle = dot(normalize(vPosVS-uSpotlights[i]), vVSSpotlightDirection);
        //if(cosangle < 0.9){ //senza if non viene tagliato direttamente
          tmplight = tmplight * pow(max(0.0, cosangle), 10.0); //così la luce viene concentrata
        //}
        
        spotlightLight += tmplight;
      }
      vec3 spotlightColor = vec3(0.996, 0.698, 0.902) /*very cool colour*/ * spotlightLight;

      gl_FragColor = vec4(diffuseColor + specularColor + spotlightColor + (headlightColorDx.rgb * headlightColorDx.a) + (headlightColorSx.rgb * headlightColorSx.a), 1.0);


      //gl_FragColor = vec4(headlightColorDx.r, 0.0, 0.0, 1.0);
      //gl_FragColor = vec4(headlightColorDx.a, 0.0, 0.0, 1.0);
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
  var aTextureCoordsIndex = 2; //indice texture: dove andare a mettere le coordinate della texture
  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.bindAttribLocation(shaderProgram, aPositionIndex, "aPosition");
  gl.bindAttribLocation(shaderProgram, aNormalIndex, "aNormal");
  gl.bindAttribLocation(shaderProgram, aTextureCoordsIndex, "aTextureCoords");
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
  shaderProgram.aTextureCoordsIndex = aTextureCoordsIndex;
  shaderProgram.uModelViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
  shaderProgram.uProjectionMatrixLocation = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
  shaderProgram.uColorLocation = gl.getUniformLocation(shaderProgram, "uColor");
  shaderProgram.uViewSpaceLightDirectionLocation = gl.getUniformLocation(shaderProgram, "uViewSpaceLightDirection");
  shaderProgram.uViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uViewMatrix");
  shaderProgram.uInverseViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uInverseViewMatrix"); //inversa view matrix

  //spotlights
  shaderProgram.uSpotlightsLocation = gl.getUniformLocation(shaderProgram, "uSpotlights");
  //textures
  shaderProgram.uTexturesEnabledLocation = gl.getUniformLocation(shaderProgram, "uTexturesEnabled");

  shaderProgram.uSamplerLocation = gl.getUniformLocation(shaderProgram, "uSampler");
  shaderProgram.uHeadlightSamplerLocation = gl.getUniformLocation(shaderProgram, "uHeadlightSampler"); //headlights texture

  //headlights
  shaderProgram.uHeadlightSxMatrixLocation = gl.getUniformLocation(shaderProgram, "uHeadlightSxMatrix");
  shaderProgram.uHeadlightDxMatrixLocation = gl.getUniformLocation(shaderProgram, "uHeadlightDxMatrix");

  //shadow maps
  shaderProgram.uHeadlightSxLocation = gl.getUniformLocation(shaderProgram, "uHeadlightSx");
  shaderProgram.uHeadlightDxLocation = gl.getUniformLocation(shaderProgram, "uHeadlightDx");




  return shaderProgram;
};//line 55
//line 56 ;)
