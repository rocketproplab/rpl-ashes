import type { SerialPort } from "serialport";
import type { ReadlineParser } from '@serialport/parser-readline';

declare global {
    interface Window {
        SerialPort: any;
        ReadlineParser: any
    }
}