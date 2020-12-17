'use strict';

import React, { Component } from 'react';
import { Image, ImageBackground } from 'react-native';
import PropTypes from 'prop-types';
import ViewTransformer from 'react-native-view-transformer';

let DEV = false;
const DELAY_SHOW_IMAGE_TIME = 500;

export default class TransformableImage extends Component {

    static enableDebug() {
        DEV = true;
    }

    static propTypes = {
        pixels: PropTypes.shape({
            width: PropTypes.number,
            height: PropTypes.number,
        }),

        enableTransform: PropTypes.bool,
        enableScale: PropTypes.bool,
        enableTranslate: PropTypes.bool,
        onSingleTapConfirmed: PropTypes.func,
        onTransformGestureReleased: PropTypes.func,
        onViewTransformed: PropTypes.func,
        onImageMove: PropTypes.func,
    };

    static defaultProps = {
        enableTransform: true,
        enableScale: true,
        enableTranslate: true,
        shouldBlockNativeResponder: true,
        placeHolderStyle:{},
    };

    constructor(props) {
        super(props);

        this.state = {
            width: 0,
            height: 0,
            pixels: undefined,
            keyAcumulator: 1,
            imageOpacity: 0,
            placeHolderImageSource: this.props.placeHolderImageSource || require("../images/placeholder.png"),
            imageLoaded: false,
            uri: this.props.source && this.props.source.uri
        };
    }

    static getDerivedStateFromProps(props, state) {
        if (!props.pixels) {
            return {
                ...state,
                ...TransformableImage.getImageSize(props.source, state)
            }
        } else if ((props && props.source && state) && props.source.uri != state.uri) {
            return {
                ...state,
                uri: props.uri,
                pixels: undefined, 
                keyAcumulator: state.keyAcumulator + 1,
                ...TransformableImage.getImageSize(props.source, state)

            }
        }

        return null
    }

    componentDidMount() {
        this._isMounted = true;
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    render() {
        let maxScale = 1;
        let contentAspectRatio = undefined;
        let width, height; //pixels

        if (this.props.pixels) {
            //if provided via props
            width = this.props.pixels.width;
            height = this.props.pixels.height;
        } else if (this.state.pixels) {
            //if got using Image.getSize()
            width = this.state.pixels.width;
            height = this.state.pixels.height;
        }

        if (width && height) {
            contentAspectRatio = width / height;
            if (this.state.width && this.state.height) {
                maxScale = Math.max(width / this.state.width, height / this.state.height);
                maxScale = Math.max(1, maxScale);
            }
        }

        return (
            <ViewTransformer
                ref='viewTransformer'
                key={'viewTransformer#' + this.state.keyAccumulator} //when image source changes, we should use a different node to avoid reusing previous transform state
                enableTransform={this.props.enableTransform && this.state.imageLoaded} //disable transform until image is loaded
                enableScale={this.props.enableScale}
                enableTranslate={this.props.enableTranslate}
                enableResistance={true}
                shouldBlockNativeResponder={this.props.shouldBlockNativeResponder}
                onTransformGestureReleased={this.props.onTransformGestureReleased}
                onViewTransformed={this.props.onViewTransformed}
                onSingleTapConfirmed={this.props.onSingleTapConfirmed}
                maxScale={maxScale}
                contentAspectRatio={contentAspectRatio}
                onLayout={this.onLayout.bind(this)}
                style={this.props.style}
                onImageMove={this.props.onImageMove}
                isResetScale={this.props.isResetScale}
            >

            {this.props.placeHolderImageSource ? (
                <ImageBackground
                resizeMode={this.props.resizeMode}
                style={[{flex:1, width:null, height:null},this.props.placeHolderStyle]}
                source={this.state.placeHolderImageSource}
                >
                <Image
                    {...this.props}
                    style={[this.props.style, {backgroundColor: 'transparent', opacity: this.state.imageOpacity}]}
                    onLoadStart={this.onLoadStart.bind(this)}
                    onLoad={this.onLoad.bind(this)}
                    capInsets={{left: 0.1, top: 0.1, right: 0.1, bottom: 0.1}} //on iOS, use capInsets to avoid image downsampling
                />
                </ImageBackground>
            ) : ( 
                <Image
                    {...this.props}
                    style={[this.props.placeHolderStyle, this.props.style, {backgroundColor: 'transparent', opacity: this.state.imageOpacity}]}
                    onLoadStart={this.onLoadStart.bind(this)}
                    onLoad={this.onLoad.bind(this)}
                    capInsets={{left: 0.1, top: 0.1, right: 0.1, bottom: 0.1}} //on iOS, use capInsets to avoid image downsampling
                />
            )}
    
            </ViewTransformer>
        );
    }

    onLoadStart(e) {
        this.props.onLoadStart && this.props.onLoadStart(e);
    }

    onLoad(e) {
        this.props.onLoad && this.props.onLoad(e);
        setTimeout(() => {
            // Only update this state if component is still mounted, as I couldn't find a clean way to stop Image from calling onLoad.
            if (this._isMounted) {
            this.setState({
                imageOpacity: 1,
                placeHolderImageSource: null,//this.props.source,
                imageLoaded: true,
                // A issue is when the parent's opacity set to 0.5, both 2 images also be displayed(<TouchableOpacity><RbzImage</TouchableOpacity>)
                // so set placeHolder source become really image's source also, to avoid the issue.
            })
        }
    }, DELAY_SHOW_IMAGE_TIME)
    }

    onLayout(e) {
        let {width, height} = e.nativeEvent.layout;
        if (this.state.width !== width || this.state.height !== height) {
            this.setState({
                width: width,
                height: height
            });
        }
    }

    static getImageSize(source, currentState) {
        if(!source) return;
        DEV && console.log('getImageSize...' + JSON.stringify(source));

        if (typeof Image.getSize === 'function') {
            if (source && source.uri) {
                Image.getSize(
                    source.uri,
                    (width, height) => {
                    DEV && console.log('getImageSize...width=' + width + ', height=' + height);
                if (width && height) {
                    if(currentState && currentState.pixels && currentState.pixels.width === width && currentState.pixels.height === height) {
                        //no need to update state
                        return null
                    } else {
                        return {pixels: {width, height}};
                    }
                }
            },
                (error) => {
                    console.error('getImageSize...error=' + JSON.stringify(error) + ', source=' + JSON.stringify(source));
                })
            } else {
                console.warn('getImageSize...please provide pixels prop for local images');
            }
        } else {
            console.warn('getImageSize...Image.getSize function not available before react-native v0.28');
        }
    }
    getViewTransformerInstance() {
        return this.refs['viewTransformer'];
    }
}