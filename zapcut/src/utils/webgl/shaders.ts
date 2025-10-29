/**
 * WebGL Shaders for Video Rendering
 * 
 * Simple vertex and fragment shaders for rendering video textures
 * with GPU acceleration for instant clip transitions.
 */

export const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    
    varying vec2 v_texCoord;
    
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
`;

export const fragmentShaderSource = `
    precision mediump float;
    
    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    uniform float u_opacity;
    
    void main() {
        vec4 color = texture2D(u_texture, v_texCoord);
        gl_FragColor = vec4(color.rgb, color.a * u_opacity);
    }
`;

/**
 * Compile a WebGL shader
 */
export function compileShader(
    gl: WebGLRenderingContext,
    source: string,
    type: number
): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
        throw new Error('Failed to create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader compilation failed: ${info}`);
    }

    return shader;
}

/**
 * Create a WebGL program from vertex and fragment shaders
 */
export function createProgram(
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
): WebGLProgram {
    const program = gl.createProgram();
    if (!program) {
        throw new Error('Failed to create program');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`Program linking failed: ${info}`);
    }

    return program;
}

/**
 * Initialize WebGL program with default shaders
 */
export function initializeProgram(gl: WebGLRenderingContext): WebGLProgram {
    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    const program = createProgram(gl, vertexShader, fragmentShader);

    return program;
}

