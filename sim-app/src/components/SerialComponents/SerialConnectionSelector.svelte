<script lang='ts'>
    /*
        Defines a selector for 
    */
    
    import { Select, ProgressCircular, Button, TextField } from "smelte";
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import type { SerialPort } from "serialport";
    import type { ReadlineParser } from "serialport";
    const SerialPort = window.SerialPort;
    const ReadlineParser = window.ReadlineParser;
    import type { PortInfo } from "@serialport/bindings-cpp";
    import SerialBaudRateSelect from "./SerialBaudRateSelect.svelte";

    // Event handlers
    const dispatch = createEventDispatcher<{selectAndOpenSerialPort: {port: SerialPort, parser: ReadlineParser}, selectAndFailToOpenSerialPort: {portPath: string, error: Error}, serialPortClosing: {port: SerialPort, parser: ReadlineParser}}>();

    console.log(window.SerialPort);
    
    let isRetrievingListOfPorts: boolean = false;
    let listOfPorts: Array<PortInfo> = [];
    
    let openPort: SerialPort | undefined = undefined;
    let readlineParser: ReadlineParser | undefined = undefined;
    let isConnectingToPort: boolean = false;
    let wasErrorConnectingToPort: boolean = false;
    let errorConnectingToPort: string | undefined = undefined;

    let selectedPortPath: string = "";
    let selectedBaudRate = 9600;
    
    let wasErrorRetrievingListOfPorts: boolean = false;
    let errorRetrievingListOfPorts: string | undefined = undefined;

    /**
     * Run this function to refresh the list of ports.
    */
    function refreshPortsList(): void {
        
        // If we are already retrieving the ports list, avoid repeating work.
        if (isRetrievingListOfPorts) { return; }
        isRetrievingListOfPorts = true; // Now retrieving.

        SerialPort.list().then( 
            (ports) => {
                wasErrorRetrievingListOfPorts = false;
                errorRetrievingListOfPorts = undefined;
                listOfPorts = ports;
            }
        ).catch(
            (err) => {
                wasErrorRetrievingListOfPorts = true;
                errorRetrievingListOfPorts = err;
                listOfPorts = [] 
            }
        ).finally(
            () => { isRetrievingListOfPorts = false; }
        )
    }

    /**
     * This function closes the current connection. If the current connection
     * does not exist, it does nothing.
     */
    function closeCurrentPort(): void {
        // Close managed port if object is to be destroyed.
        if (typeof openPort !== 'undefined' && openPort.isOpen) {
            openPort.drain(() => {
                openPort.close(
                    (err) => {
                        openPort = undefined;
                        selectedPortPath = "";
                    }
                );
            });
        }
    }

    /**
     * Attempts to open a new port on the given path and address.
     */
    function attemptToOpenPort(portPath: string, baudRate: number): void {
        
        // Close current port before connecting
        closeCurrentPort();

        // One connection operation at a time.
        if (isConnectingToPort || typeof openPort !== 'undefined' ) { return; }
        isConnectingToPort = true;
        wasErrorConnectingToPort = false; // Reset error state

        // Open port
        selectedPortPath = portPath;
        openPort = new SerialPort({
            autoOpen: false,
            path: portPath,
            baudRate: baudRate
        });
        readlineParser = openPort.pipe(new ReadlineParser({encoding: 'ascii'}));

        console.log("Attempting to connect to " + openPort.path + "...");

        openPort.open(
            (err) => {

                isConnectingToPort = false; // No longer connecting.

                if (err) { // Error handling
                    
                    console.log("Failed to connect to " + openPort.path + ". See following error");
                    console.log(err);

                    wasErrorConnectingToPort = true;
                    errorConnectingToPort = err.message;
                    dispatch('selectAndFailToOpenSerialPort', { portPath: selectedPortPath, error: err });
                    
                    return;
                }

                // Finish configuration with safe cleanup.
                openPort.on('close', 
                    () => {
                        
                        console.log("Connection to " + openPort.path + " closed.");
                        
                        dispatch('serialPortClosing', { port: openPort, parser: readlineParser });
                        
                        closeCurrentPort();
                        refreshPortsList();

                    }
                );
                openPort.on('error', 
                    (err: Error) => {

                        console.log("Connection to " + openPort.path + " closed due to error.");
                        console.log(err)

                        dispatch('serialPortClosing', { port: openPort, parser: readlineParser });
                        
                        closeCurrentPort();
                        refreshPortsList();

                    }
                );

                // Notify listening parent.
                dispatch('selectAndOpenSerialPort', { port: openPort, parser: readlineParser });
                console.log("Connection to " + openPort.path + " successful!!!");

            }
        )

    }

    /**
     * Returns true if connected, false otherwise.
    */
    function isConnected(): boolean {
        return typeof openPort !== 'undefined' && openPort.isOpen;
    }

    /**
     * Fired when baud rate is changed by application.
     * @param event The event
     */
    function onBaudRateChanged(event: CustomEvent<number>): void {
        
        // No Baud rate change
        if (event.detail == selectedBaudRate) {
            return;
        }

        console.log(event);

        if (isConnected()) {
            selectedBaudRate = event.detail;
            openPort.update({baudRate: selectedBaudRate});
        }
        else if (isConnectingToPort) { // No changing Baud rate on opening connection
            return;
        }
        else { // Closed.
            selectedBaudRate = event.detail;
        }
    }

    /**
     * onMount is executed when this component is mounted to the DOM.
    */
    onMount(
        () => {
            // Get port info
            refreshPortsList();
        }
    );

    /**
     * onDestroy is executed when this object is removed from the DOM.
    */
    onDestroy( 
        () => {
            console.log("running close on destroy operation");
            closeCurrentPort();
        } 
    );

</script>

<div class="flex content-center">
    <!-- Only allow changing port if connection is open or closed; no interrupting opening connections -->
    <div class="flex-auto pr-1">
        {#if isConnectingToPort}
            <TextField dense label="Serial Port" value={selectedPortPath} onChange={onBaudRateChanged} />
        {:else}
            <Select dense label="Serial Port" value={selectedPortPath} items={ listOfPorts.map( (port) => { return {text: port.path, value: port.path } } ) } on:change={(event) => { attemptToOpenPort(event.detail, selectedBaudRate);  }} />
        {/if}
    </div>

    <div class="flex-auto px-1">
        <SerialBaudRateSelect disabled={isConnectingToPort} value={selectedBaudRate} on:change={onBaudRateChanged}/>
    </div>

    {#if isRetrievingListOfPorts}
            <ProgressCircular />
    {:else}
            <Button small icon="refresh" on:click={() => { refreshPortsList(); }} />
    {/if}
    {#if wasErrorRetrievingListOfPorts}
        <p class="text-error-500">
            {errorRetrievingListOfPorts}
        </p>
    {/if}
</div>
