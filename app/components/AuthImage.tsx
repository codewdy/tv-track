import React, { useEffect, useState } from 'react';
import { Image, ImageProps, View, ActivityIndicator, StyleSheet } from 'react-native';

interface AuthImageProps extends Omit<ImageProps, 'source'> {
    uri: string;
    headers?: Record<string, string>;
}

export const AuthImage: React.FC<AuthImageProps> = ({ uri, headers, style, ...props }) => {
    const [imgSource, setImgSource] = useState<{ uri: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchImage = async () => {
            try {
                const response = await fetch(uri, { headers });

                if (!response.ok) {
                    throw new Error(`Failed to load image: ${response.status}`);
                }

                const blob = await response.blob();
                const reader = new FileReader();

                reader.onloadend = () => {
                    if (isMounted) {
                        setImgSource({ uri: reader.result as string });
                        setLoading(false);
                    }
                };

                reader.onerror = () => {
                    if (isMounted) {
                        setError('Failed to read image data');
                        setLoading(false);
                    }
                };

                reader.readAsDataURL(blob);
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };

        fetchImage();

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
