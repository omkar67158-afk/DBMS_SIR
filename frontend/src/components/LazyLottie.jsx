import LottieModule from 'lottie-react';
const Lottie = typeof LottieModule === 'function' ? LottieModule : LottieModule?.default?.default || LottieModule?.default || LottieModule;
import animationData from '../../Untitled file.json';

export default function LazyLottie(props) {
  return <Lottie animationData={animationData} {...props} />;
}
