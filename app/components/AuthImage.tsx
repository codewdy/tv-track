import React, { useEffect, useState } from 'react';
import { Image, ImageProps, View, ActivityIndicator, StyleSheet } from 'react-native';

interface AuthImageProps extends Omit<ImageProps, 'source'> {
    uri: string;
    headers?: Record<string, string>;
}

import { getCachedImage, downloadAndCacheImage } from '../utils/imageCache';

export const AuthImage: React.FC<AuthImageProps> = ({ uri, headers, style, ...props }) => {
    const [imgSource, setImgSource] = useState<{ uri: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadImage = async () => {
            try {
                // 1. Check cache
                const cachedUri = await getCachedImage(uri);
                if (cachedUri) {
                    if (isMounted) {
                        setImgSource({ uri: cachedUri });
                        setLoading(false);
                    }
                    return;
                }

                // 2. Download and cache
                const downloadedUri = await downloadAndCacheImage(uri, headers);
                if (downloadedUri) {
                    if (isMounted) {
                        setImgSource({ uri: downloadedUri });
                        setLoading(false);
                    }
                } else {
                    throw new Error('Failed to download image');
                }

            } catch (err: any) {
                if (isMounted) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };

        loadImage();

        return () => {
            isMounted = false;
        };
    }, [uri]);

    if (loading) {
        return (
            <View style={[style, styles.center]}>
                <ActivityIndicator size="small" />
            </View>
        );
    }

    if (error || !imgSource) {
        return <View style={[style, styles.errorPlaceholder]} />;
    }

    return <Image {...props} style={style} source={imgSource} />;
};

const styles = StyleSheet.create({
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    errorPlaceholder: {
        backgroundColor: '#ddd',
    },
});
