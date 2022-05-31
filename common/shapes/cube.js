///// CUBE DEFINTION
/////
///// Cube is defined to be centered at the origin of the coordinate reference system. 
///// Cube size is assumed to be 2.0 x 2.0 x 2.0 .
function Cube () {

	this.name = "cube";
	
	// vertices definition
	////////////////////////////////////////////////////////////
	this.vertices = new Float32Array([
		-1.0, -1.0,  1.0,
		 1.0, -1.0,  1.0,
		-1.0,  1.0,  1.0,
		 1.0,  1.0,  1.0,
		-1.0, -1.0, -1.0,
		 1.0, -1.0, -1.0,
		-1.0,  1.0, -1.0,
		 1.0,  1.0, -1.0
	]);

	// triangles definition
	////////////////////////////////////////////////////////////
	
	this.triangleIndices = new Uint16Array([
		0, 1, 2,  2, 1, 3,  // front
		5, 4, 7,  7, 4, 6,  // back
		4, 0, 6,  6, 0, 2,  // left
		1, 5, 3,  3, 5, 7,  // right
		2, 3, 6,  6, 3, 7,  // top
		4, 5, 0,  0, 5, 1   // bottom
	]);
	
	this.numVertices = this.vertices.length/3;
	this.numTriangles = this.triangleIndices.length/3;

	//textures
	var nv = this.vertices.length
	var vertexOffset = 0
	var min_u = 0;
	var max_u = 1;
	var min_v = 0;
	var max_v = 1;
	var scale = 1;
	this.texCoords = new Float32Array( nv * 2);
	for (var i=0; i<nv; ++i) {
		this.texCoords[vertexOffset + 0] = scale*(this.vertices[3*i] - min_u)/max_u;
		this.texCoords[vertexOffset + 1] = scale*(this.vertices[3*i+2] - min_v)/max_v;
		vertexOffset += 2;
	}

	this.texCoords[0] = 0.0;
	this.texCoords[1] = 0.0;
	this.texCoords[2] = 1.0;
	this.texCoords[3] = 0.0;
	this.texCoords[4] = 1.0;
	this.texCoords[5] = 1.0;
	this.texCoords[6] = 0.0;
	this.texCoords[7] = 1.0;
}