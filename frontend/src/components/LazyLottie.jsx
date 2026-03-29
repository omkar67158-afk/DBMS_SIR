import Lottie from 'lottie-react';
import animationData from '../../Untitled file.json';

export default function LazyLottie(props) {
  return <Lottie animationData={animationData} {...props} />;
}
