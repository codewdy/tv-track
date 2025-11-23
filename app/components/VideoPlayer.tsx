import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Episode } from '../types';
import { API_CONFIG } from '../config';

interface Props {
    episode: Episode | null;
    initialPosition?: number; // in seconds
    style?: ViewStyle;
    onPlaybackStatusUpdate?: (status: any) => void;
}

export default function VideoPlayer({ episode, initialPosition = 0, style, onPlaybackStatusUpdate }: Props) {
    const getVideoUrl = (url: string) => {
        if (url.startsWith('http')) return url;
        return `${API_CONFIG.BASE_URL}${url}`;
    };

    const player = useVideoPlayer(
        episode ? getVideoUrl(episode.url) : null,
        (player) => {
            player.loop = false;
        }
    );

    // Update player source when episode changes
    useEffect(() => {
        if (episode) {
            const url = getVideoUrl(episode.url);
            player.replace({
                uri: url,
                headers: { Authorization: API_CONFIG.AUTH_HEADER }
            });
        }
    }, [episode]);

    // Seek to initial position after player is ready
    useEffect(() => {
        if (episode && player && initialPosition > 0) {
            // Wait a bit for the video to load before seeking
            const timer = setTimeout(() => {
                try {
                    player.currentTime = initialPosition;
                    player.play();
                } catch (error) {
                    console.error('Failed to seek to initial position:', error);
                }
            }, 500);
            return () => clearTimeout(timer);
        } else if (episode && player) {
            player.play();
        }
    }, [episode, initialPosition]);

    return (
        <VideoView
            style={[styles.video, style]}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
        />
    );
}

const styles = StyleSheet.create({
    video: {
        flex: 1,
    },
});
