/*global define*/
define([
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Renderer/ShaderSource',
        './BlendingState',
        './CullFace'
    ], function(
        clone,
        defaultValue,
        defined,
        defineProperties,
        ShaderSource,
        BlendingState,
        CullFace) {
    "use strict";

    /**
     * An appearance defines the full GLSL vertex and fragment shaders and the
     * render state used to draw a {@link Primitive}.  All appearances implement
     * this base <code>Appearance</code> interface.
     *
     * @alias Appearance
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Boolean} [options.translucent=true] When <code>true</code>, the geometry is expected to appear translucent so {@link Appearance#renderState} has alpha blending enabled.
     * @param {Boolean} [options.closed=false] When <code>true</code>, the geometry is expected to be closed so {@link Appearance#renderState} has backface culling enabled.
     * @param {Material} [options.material=Material.ColorType] The material used to determine the fragment color.
     * @param {String} [options.vertexShaderSource] Optional GLSL vertex shader source to override the default vertex shader.
     * @param {String} [options.fragmentShaderSource] Optional GLSL fragment shader source to override the default fragment shader.
     * @param {RenderState} [options.renderState] Optional render state to override the default render state.
     *
     * @see MaterialAppearance
     * @see EllipsoidSurfaceAppearance
     * @see PerInstanceColorAppearance
     * @see DebugAppearance
     * @see PolylineColorAppearance
     * @see PolylineMaterialAppearance
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Geometry%20and%20Appearances.html|Geometry and Appearances Demo}
     */
    var Appearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The material used to determine the fragment color.  Unlike other {@link Appearance}
         * properties, this is not read-only, so an appearance's material can change on the fly.
         *
         * @type Material
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}
         */
        this.material = options.material;

        /**
         * When <code>true</code>, the geometry is expected to appear translucent.
         *
         * @type {Boolean}
         *
         * @default true
         */
        this.translucent = defaultValue(options.translucent, true);

        this._vertexShaderSource = options.vertexShaderSource;
        this._fragmentShaderSource = options.fragmentShaderSource;
        this._renderState = options.renderState;
        this._closed = defaultValue(options.closed, false);
    };

    defineProperties(Appearance.prototype, {
        /**
         * The GLSL source code for the vertex shader.
         *
         * @memberof Appearance.prototype
         *
         * @type {String}
         * @readonly
         */
        vertexShaderSource : {
            get : function() {
                return this._vertexShaderSource;
            }
        },

        /**
         * The GLSL source code for the fragment shader.  The full fragment shader
         * source is built procedurally taking into account the {@link Appearance#material}.
         * Use {@link Appearance#getFragmentShaderSource} to get the full source.
         *
         * @memberof Appearance.prototype
         *
         * @type {String}
         * @readonly
         */
        fragmentShaderSource : {
            get : function() {
                return this._fragmentShaderSource;
            }
        },

        /**
         * The WebGL fixed-function state to use when rendering the geometry.
         *
         * @memberof Appearance.prototype
         *
         * @type {Object}
         * @readonly
         */
        renderState : {
            get : function() {
                return this._renderState;
            }
        },

        /**
         * When <code>true</code>, the geometry is expected to be closed.
         *
         * @memberof Appearance.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        closed : {
            get : function() {
                return this._closed;
            }
        }
    });

    /**
     * Procedurally creates the full GLSL fragment shader source for this appearance
     * taking into account {@link Appearance#fragmentShaderSource} and {@link Appearance#material}.
     *
     * @returns {String} The full GLSL fragment shader source.
     */
    Appearance.prototype.getFragmentShaderSource = function() {
        var defines = [];
        if (this.flat) {
            defines.push('FLAT');
        }
        if (this.faceForward) {
            defines.push('FACE_FORWARD');
        }

        var sources = [];
        if (defined(this.material)) {
            sources.push(this.material.shaderSource);
        }
        sources.push(this.fragmentShaderSource);

        // includeBuiltIns is false because the primitive will create its own ShaderSource containing our source
        var shaderSource = new ShaderSource({
            defines : defines,
            sources : sources,
            includeBuiltIns : false
        });

        return shaderSource.getCombinedShader(true);
    };

    /**
     * Determines if the geometry is translucent based on {@link Appearance#translucent} and {@link Material#isTranslucent}.
     *
     * @returns {Boolean} <code>true</code> if the appearance is translucent.
     */
    Appearance.prototype.isTranslucent = function() {
        return (defined(this.material) && this.material.isTranslucent()) || (!defined(this.material) && this.translucent);
    };

    /**
     * Creates a render state.  This is not the final render state instance; instead,
     * it can contain a subset of render state properties identical to the render state
     * created in the context.
     *
     * @returns {Object} The render state.
     */
    Appearance.prototype.getRenderState = function() {
        var translucent = this.isTranslucent();
        var rs = clone(this.renderState, false);
        if (translucent) {
            rs.depthMask = false;
            rs.blending = BlendingState.ALPHA_BLEND;
        } else {
            rs.depthMask = true;
        }
        return rs;
    };

    /**
     * @private
     */
    Appearance.getDefaultRenderState = function(translucent, closed) {
        var rs = {
            depthTest : {
                enabled : true
            }
        };

        if (translucent) {
            rs.depthMask = false;
            rs.blending = BlendingState.ALPHA_BLEND;
        }

        if (closed) {
            rs.cull = {
                enabled : true,
                face : CullFace.BACK
            };
        }

        return rs;
    };

    return Appearance;
});