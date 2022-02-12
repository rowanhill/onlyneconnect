import firebase from '../../firebase';
import '../../firebase-functions';
import { ZoomClient } from './zoomTypes';
import { Quiz } from '../../models';

export const joinZoomSession = async (
    zoomClient: ZoomClient,
    quizId: string,
    quiz: Quiz,
    nameGenerator: (id: string) => string,
) => {
    // Generate the signature of a JWT server-side
    const generateZoomToken = firebase.functions().httpsCallable('generateZoomToken');
    const tokenResult = await generateZoomToken({ quizId, topic: quiz.name });
    const token = tokenResult.data;
    
    // Join the call - first user to join becomes host
    const currentUser = firebase.auth().currentUser;
    const id = currentUser?.displayName || currentUser?.email || currentUser?.uid || 'Unknown';
    const name = nameGenerator(id);
    await zoomClient.join(quiz.name, token, name);

    // Start the audio & video
    return zoomClient.getMediaStream();
};