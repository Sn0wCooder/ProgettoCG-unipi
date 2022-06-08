const glsl = x => x; //plugin vscode

uniformShader = function (gl) {//line 1,Listing 2.14
  var vertexShaderSource = glsl` //syntax highlighting
    uniform   mat4 uModelViewMatrix;
    uniform   mat4 uProjectionMatrix; //matrice di proiezione
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
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0); //passa da oggetto a proiezione
      vViewSpaceNormal = normalize(uModelViewMatrix * vec4(aNormal, 0.0)).xyz; //serve nel fragment per phong
      vViewSpaceViewDirection = -normalize(uModelViewMatrix * vec4(aPosition, 1.0)).xyz; //idem
      vPosVS = (uModelViewMatrix * vec4(aPosition, 1.0)).xyz; //posizione in VS, da oggetto a vista
      
      //calcolo la direzione dei faretti in VS
      //line 28
      vVSSpotlightDirection = normalize(uViewMatrix * vec4(0.0, -1.0, 0.0, 0.0)).xyz; //vado verso il basso in view space

      vTextureCoords = aTextureCoords; //per passarle al fragment

      mat4 modelMatrix = uInverseViewMatrix * uModelViewMatrix; //non passo la model matrix, la calcolo

      vPosition = modelMatrix * vec4(aPosition, 1.0); //posizione vertice in world space
    }
  `;

  var fragmentShaderSource = glsl`
    precision highp float;
    uniform vec4 uColor; //colore uniforme per l'oggetto
    uniform sampler2D uSampler; //per accedere alla texture
    uniform int uTexturesEnabled; //se le texture sono abilitate
    //PHONG
    uniform vec3 uViewSpaceLightDirection;
    varying vec3 vViewSpaceNormal; //normale in view space
    varying vec3 vViewSpaceViewDirection;
    varying vec3 vPosVS; //posizione view space


    varying vec2 vTextureCoords;

    //spotlights
    uniform vec3 uSpotlights[12]; //posizioni spotlight in world
    varying vec3 vVSSpotlightDirection; //direzione verso il basso
    
    //coordinate texture headlights
    uniform sampler2D uHeadlightSampler;
    uniform mat4 uHeadlightDxMatrix; //per trasformare da spazio mondo a clip space degli headlights. Passate come proiezione * vista. Per proiettare la texture sul mondo
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
      
      //PHONG
      float diffuseLight = max(dot(uViewSpaceLightDirection, vViewSpaceNormal), 0.0) * 0.5 + 0.5; //+0.5 perchè almeno anche al buio c'è un po' di luce, *0.5 per riscalarlo (visto che c'è +0.5)
      vec3 diffuseColor = color * diffuseLight; //colore * luminosità
      
      vec3 reflectedLightDirection = -uViewSpaceLightDirection + 2.0 * dot(uViewSpaceLightDirection, vViewSpaceNormal) * vViewSpaceNormal; //riflesso direzione di vista rispetto alla normale
      float specularLight = max(0.0, pow(dot(vViewSpaceViewDirection, reflectedLightDirection), 1.0)); //1.0 shininess
      vec3 specularColor = color * specularLight; //colore del riflesso è della texture






      vec4 vHeadlightDxTextureCoords = (uHeadlightDxMatrix * vPosition); //per passare da mondo a clip space delle headlight
      vec4 vHeadlightSxTextureCoords = (uHeadlightSxMatrix * vPosition);

      vHeadlightDxTextureCoords /= vHeadlightDxTextureCoords.w; //divido per l'ultima componente per la proiezione prospettica
      vHeadlightSxTextureCoords /= vHeadlightSxTextureCoords.w;

      vHeadlightDxTextureCoords = vHeadlightDxTextureCoords * 0.5 + 0.5; //così le coordinate texture vanno da 0 a 1 (visto che le coordinate clip: [-1, 1])
      vHeadlightSxTextureCoords = vHeadlightSxTextureCoords * 0.5 + 0.5;

      float slopeDependentBias = clamp(0.005 * tan(acos(dot(vViewSpaceNormal, uViewSpaceLightDirection))), 0.00001, 0.01);

      //headlights
      vec4 headlightColorDx;
      if(vHeadlightDxTextureCoords.x >= 0.0 && vHeadlightDxTextureCoords.x <= 1.0 && vHeadlightDxTextureCoords.y >= 0.0 && vHeadlightDxTextureCoords.y <= 1.0 && vHeadlightDxTextureCoords.z >= 0.0 && vHeadlightDxTextureCoords.z <= 1.0){ //evita il wrapping
        float depth = texture2D(uHeadlightDx, vHeadlightDxTextureCoords.xy).z; //shadow map
        if(depth + slopeDependentBias > vHeadlightDxTextureCoords.z){ //se è minore ci metto il valore della texture (proietto il faretto)
          headlightColorDx = texture2D(uHeadlightSampler, vHeadlightDxTextureCoords.xy);
        }else{
          headlightColorDx = vec4(0.0,0.0,0.0,0.0);
        }
      }else{ //le coordinate sono fuori
        headlightColorDx = vec4(0.0,0.0,0.0,0.0);
      }

      vec4 headlightColorSx;
      if(vHeadlightSxTextureCoords.x >= 0.0 && vHeadlightSxTextureCoords.x <= 1.0 && vHeadlightSxTextureCoords.y >= 0.0 && vHeadlightSxTextureCoords.y <= 1.0 && vHeadlightSxTextureCoords.z >= 0.0 && vHeadlightDxTextureCoords.z <= 1.0){
        float depth = texture2D(uHeadlightSx, vHeadlightSxTextureCoords.xy).z; //shadow map
        if(depth + slopeDependentBias > vHeadlightSxTextureCoords.z){ //se è minore ci metto il valore della texture (proietto il faretto)
          headlightColorSx = texture2D(uHeadlightSampler, vHeadlightSxTextureCoords.xy);
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
        //if(cosangle < 0.9){ //per cuttare
        tmplight = tmplight * pow(max(0.0, cosangle), 10.0); //focus luce, più larga o più concentrata
        //}
        
        spotlightLight += tmplight;
      }
      vec3 spotlightColor = vec3(0.996, 0.698, 0.902) /*very cool colour*/ * spotlightLight;

      //colore finale, somma di tutte le componenti
      gl_FragColor = vec4(diffuseColor + specularColor + spotlightColor + (headlightColorDx.rgb * headlightColorDx.a) + (headlightColorSx.rgb * headlightColorSx.a), 1.0);
      //gl_FragColor = vHeadlightSxTextureCoords;

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
