// TypeScript does not resolve React Native platform suffixes on its own.
// Metro selects PoseCapture.web.tsx or PoseCapture.native.tsx at bundle time.
export { PoseCapture } from './PoseCapture.native';
