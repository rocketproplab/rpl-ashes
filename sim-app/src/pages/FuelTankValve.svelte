<script lang="ts">
    // GEAR RATIO 16 - 54
    
    import { onDestroy, onMount } from "svelte";
    import SerialMonitor from "../components/SerialMonitor.svelte";
    import { Clock, AmbientLight, Scene, PerspectiveCamera, WebGLRenderer, DirectionalLight } from "three";
    import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
    import type { SerialPort, ReadlineParser } from 'serialport';
    import { OrbitControls } from 'three-orbitcontrols-ts';
    import DataDisplay from "../components/DataDisplay.svelte";
    import { Vector3 } from "three";

    const RAD_TO_DEG: number = 57.2958;

    let canvasElement: HTMLElement | undefined = undefined;
    let webGLRenderer: WebGLRenderer | undefined = undefined;

    let clock: Clock | undefined = undefined
    let scene: Scene | undefined = undefined;
    let camera: PerspectiveCamera | undefined = undefined;
    let mainLight: DirectionalLight | undefined = undefined;
    let ambientLight: AmbientLight | undefined = undefined;
    let animationFrameId: number = -1;

    let controls: OrbitControls | undefined = undefined;

    // Managed resources
    let gltfImporter: GLTFLoader | undefined = undefined;
    let structure: GLTF | undefined = undefined;

    // Servo controls
    let servoSpeedRadians: number = 0.8;
    let servoWriteValue: number = 90
    let servoCurrentRotation: number = 0;
    let valveDerivedRotation: number = 0;
    let magneticEncoderCurrentReading: number = 0;
    let magneticEncoderError: number = 0.03;
    const servoConfig = {
        gearRatio: 16/54
    }

    // Serial connection
    let serialPort: SerialPort | undefined = undefined;
    let parser: ReadlineParser | undefined = undefined;

    /**
     * Handles event when data is received over serial.
     */
    function onSerialData(data: string) {
        console.log("data: " + data);
        if (data.startsWith("sv:")) {
            let extractedData = data.slice(3, data.length - 1)
            console.log(extractedData);
            let asNumber = Number(extractedData);
            console.log(asNumber);
            servoWriteValue = asNumber;
        }
    }

    /**
     * Handles event when serial selector opens a connection
     */
    function onSerialPortOpen(event: CustomEvent<{port: SerialPort, parser: ReadlineParser}>) {
        parser = event.detail.parser;
        serialPort = event.detail.port;
        parser.on('data', onSerialData);
    }

    /**
     * Handles event when serial selector closes a connection
     */
    function onSerialPortClose(event: CustomEvent) {
        parser.off('data', onSerialData);
        parser = undefined;
        serialPort = undefined;

        servoWriteValue = 90;

        console.log(event);
    }

    /**
     * Normalizes an input angle into the range [0, 360)
     * @param angleInDegrees The angle to normalize
     */
    function normalizeReadingTo0To360(angleInDegrees: number): number {
        return (angleInDegrees >= 0 ? angleInDegrees : (360 - ((-angleInDegrees) % 360))) % 360;
    }

    // This contains the stuff that will be displayed to the user.
    let tableDisplayState: Array<{fieldName: string, fieldValue: number, canEdit: boolean}> = [
        { fieldName: "Servo Actual Angle", fieldValue: 0, canEdit: true },
        { fieldName: "Servo Max Angular Velocity", fieldValue: servoSpeedRadians * RAD_TO_DEG, canEdit: true },
        { fieldName: "Valve Actual Angle", fieldValue: 0, canEdit: false },
        { fieldName: "Magnetic Encoder Mounting Error", fieldValue: 0, canEdit: true },
        { fieldName: "Magnetic Encoder Measurement", fieldValue: 0, canEdit: false }
    ]
    

    /**
     * The update loop is called once per frame as the simulation runs.
     * Simulation logic should go here.
     */
    function updateLoop(): void {
        
        // Grab deltaTime this frame
        let deltaTime = clock.getDelta();
        
        if (typeof structure !== 'undefined') {
            //structure.scene.getObjectByName("ServoGear").rotateY(0.05);
            //structure.scene.getObjectByName("ValveGear").rotateY(-0.05*16/54);

            let servoGear = structure.scene.getObjectByName("ServoGear");
            let valveGear = structure.scene.getObjectByName("ValveGear");
            let magEncoder = structure.scene.getObjectByName("MagneticEncoder");

            // Calculate servo angular velocity this tick
            let servoAngularVelocity = -((servoWriteValue - 90) / 90) * servoSpeedRadians;
            servoCurrentRotation += servoAngularVelocity * deltaTime;
            valveDerivedRotation = -servoCurrentRotation * servoConfig.gearRatio;

            // Apply rotation
            const UP = new Vector3(0,1,0);
            servoGear.setRotationFromAxisAngle( UP, servoCurrentRotation + 0.1878340794 );
            valveGear.setRotationFromAxisAngle( UP, valveDerivedRotation + 1.5708 );
            magEncoder.setRotationFromAxisAngle( UP, magneticEncoderError );

            // Derive magnetic encoder reading
            magneticEncoderCurrentReading = normalizeReadingTo0To360((valveDerivedRotation - magneticEncoderError) * RAD_TO_DEG);


            // Set servo and valve gear rotations
            tableDisplayState[0].fieldValue = servoCurrentRotation * RAD_TO_DEG;
            tableDisplayState[1].fieldValue = servoSpeedRadians * RAD_TO_DEG;
            tableDisplayState[2].fieldValue = valveDerivedRotation * RAD_TO_DEG;
            tableDisplayState[3].fieldValue = magneticEncoderError * RAD_TO_DEG;
            tableDisplayState[4].fieldValue = magneticEncoderCurrentReading;

            // Try to send mag encoder to device
            if (typeof serialPort !== 'undefined') {
                serialPort.write(magneticEncoderCurrentReading.toFixed(3) + "\n");
            }
            
        }

        controls.update();
    }

    /**
     * The render loop handles simulation and rendering of the current frame.
     */
     function renderLoop() {
        
        // Update simulation
        updateLoop();
        
        // Render
        webGLRenderer.render(scene, camera);

        // Enqueue rendering of next frame
        animationFrameId = requestAnimationFrame(renderLoop);
    }

    /**
     * Recalculates the camera's projection matrix
     * to be consistent with a new camera size.
     */
    function recalculateCamera() {
        
        // Do not resize if no camera + canvas exists
        if (typeof camera === 'undefined' || typeof canvasElement === 'undefined') {
            return;
        }

        webGLRenderer.setSize( canvasElement.clientWidth, canvasElement.clientHeight );

        camera.aspect = canvasElement.clientWidth / canvasElement.clientHeight;
        camera.updateProjectionMatrix();

    }

    /**
     * Contains all code regarding setting up the scene once this scene is created.
     */
    function initializeScene(): void {
        
        // Initialize renderer
        webGLRenderer = new WebGLRenderer({ canvas: canvasElement, alpha: true });
        webGLRenderer.setSize( canvasElement.clientWidth, canvasElement.clientHeight );

        // Create scene
        scene = new Scene();
        clock = new Clock(true);

        // Setup camera
        camera = new PerspectiveCamera( 75, canvasElement.clientWidth / canvasElement.clientHeight, 0.1, 1000 );
        camera.position.z = 5;
        controls = new OrbitControls(camera, canvasElement);
        controls.enableZoom = true;

        // Setup managed resources
        gltfImporter = new GLTFLoader();
        gltfImporter.load('models/servo-valve-controller.glb', (gltf: GLTF) => {
            
            console.log(gltf);
            structure = gltf;
            scene.add(gltf.scene);

        });

        // Initialize light
        mainLight = new DirectionalLight(0xffffff, 2);
        mainLight.rotateX(1.039827026);
        mainLight.rotateY(0.4191565278);
        mainLight.rotateZ(0.2963115284);
        mainLight.shadowCameraLeft = -20; // or whatever value works for the scale of your scene
        mainLight.shadowCameraRight = 20;
        mainLight.shadowCameraTop = 20;
        mainLight.shadowCameraBottom = -20;
        mainLight.position.set( -60, 40, 100 );

        ambientLight = new AmbientLight(0x404040);
        scene.add(mainLight);
        scene.add(ambientLight);

        // Start rendering
        animationFrameId = requestAnimationFrame(renderLoop);

    }

    /**
     * Contains all code regarding cleaning up a scene once this object is deleted.
     */
    function cleanupScene(): void {
        
        // Cancel any rendering
        cancelAnimationFrame(animationFrameId);

        // Let GC clean up managed objects
        scene = undefined;
        camera = undefined;
        controls = undefined;

        // Dispose unmanaged resources in scene
        mainLight.dispose();
        mainLight = undefined;
        webGLRenderer.renderLists.dispose();
        structure = undefined;
        
        // Dispose of unmanaged resources from the renderer 
        webGLRenderer.dispose();
        webGLRenderer = undefined;

    }

    /**
     * onMount is called when this component is mounted to the DOM.
    */
    onMount( 
        () => {
            initializeScene(); // Start rendering!
        }
    );
    /**
     * onDestroy is called when this component is unmounted from the DOM.
    */
    onDestroy(
        () => {
            cleanupScene(); // Cleanup scene
        }
    )

</script>

<h3 class="mt-3">
    Servo Valve Emulator
</h3>
<div class="flex">
    <canvas style="flex-grow:1;" on:resize={() => {recalculateCamera}} bind:this={canvasElement} />
    <div style="width:45%">
        <SerialMonitor 
            on:selectAndOpenSerialPort={onSerialPortOpen}
            on:serialPortClosing={onSerialPortClose}
        />
        
        <DataDisplay 
            data={tableDisplayState}
            columns={
                [
                    {
                        fieldName: "fieldName",
                        displayedAsText: "Field Name",
                        canEdit: false
                    },
                    {
                        fieldName: "fieldValue",
                        displayedAsText: "Field Value",
                        canEdit: true
                    }
                ]
            } 
            />
    </div>
</div>