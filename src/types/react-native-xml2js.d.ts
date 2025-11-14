declare module 'react-native-xml2js' {
  export function parseString(xml: string, options: any, callback: (err: any, result: any) => void): void;
  export function parseString(xml: string, callback: (err: any, result: any) => void): void;
}