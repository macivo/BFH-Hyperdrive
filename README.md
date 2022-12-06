# ![](https://www.bfh.ch/dam/jcr:36ac8a9a-6176-44fe-8e69-064cffb38e5b/logo_l-xs-home-und-footer_de.svg) Bern University of Applied Sciences
#### BTI3051 Bachelorthesis FS2022 : Standalone Track Editor and Observer for Anki Overdrive - BFH Hyperdrive
#### Student: Mac Müller
#### Advisor: Prof. Dr. Reto König
#### Expert: Thomas Jäggi

------------
#### ![](http://twemoji.maxcdn.com/36x36/1f4e3.png) Introduction
This bachelor thesis at the Bern University of Applied Sciences aims to develop a standalone system "BFH Hyperdrive". It is a standalone system to observe the original car racing game "Anki Overdrive". It is ideally suited as a base system for application areas in research such as traffic simulations or process control. 

**BFH Hyperdrive is:**
- A standalone system, which is ready immediately after starting the computer.
- The Track Editor can generate the track images with the SVG format.
- In difference to PNG, the SVG file size has become up to 40 times smaller.
- The quality of the printed tracks is excellent.
- The animation of the digital twin has become smoother and more accurate.
- Optionally, it can work collaboratively in the network with other "BFH Hyperdrive".

#### ![](http://twemoji.maxcdn.com/36x36/1f4e3.png) Application starting guide
1. Connect the computer to the power supply.
2. Supply power to the station of the vehicles (plug in the power adapter/USB port on the computer).
3. Run a web browser and call the main page (index.html)  `localhost`

Alternatively: connect the computer with an Ethernet cable and call the main page (index.html) `http://192.168.5.5`. There are only static IP addresses on the computer, and no DHCP server. Please make sure that you are in the same network /24.

#### ![](http://twemoji.maxcdn.com/36x36/1f4e3.png) Application Digital Twin guide
1. Minimum speed should be 300 (mm/s).

#### ![](http://twemoji.maxcdn.com/36x36/1f4e3.png) Installation instructions for a new computer
The system can be built as a new BFH Hyperdrive using the following instructions:

Computer Requirements:
- Linux operating system
- Eclipse Mosquitto MQTT broker
- Node.Js 10.13.x or higher
- Chromium Browser 98.0 or higher

A static IP address for the Ethernet interface should be set on the computer. e.g.192.168.5.5/24.

Download the code of BFH Hyperdrive from the this Gitlab repository. The file "car_controller.zip" must be unzipped.

The MQTT broker is to be configured as follows. The configuration file is located on the `/etc/mosquitto/mosquitto.conf` directory.
```
listener 1883
protocol mqtt
allow_anonymous true

listener 9001
protocol websockets
http_dir /home/pi/Desktop/Frontend #<--- directory of frontend
allow_anonymous true

######################
##### Bridge Config #####
```
To set the car controller as a system service, the following text file should be created in the folder `/etc/systemd/system/anki_car_controller.service`. the ExecStart is the directory of the Node.js and the file of car controller.
```
[Unit]
Description=Anki Overdrive Car Controller

Wants=network.target
After=syslog.target network-online.target

[Service]
Type=simple
ExecStart=ExecStart=/usr/local/bin/node /home/pi/Desktop/nodejsankisdk/host.js
Restart=always
RestartSec=5
KillMode=process

[Install]
WantedBy=multi-user.target
```
Activate and start the following services with the following commands:
- `sudo systemctl enable mosquitto.service`
- `sudo systemctl enable anki_car_controller.service`
- `sudo systemctl restart mosquitto.service`
- `sudo systemctl restart anki_car_controller.service` 

The front-end-Application can now be accessed directly via the system's browser or via the IP address in the LAN, e.g. http://192.168.5.5:9001.

##### ![](http://twemoji.maxcdn.com/36x36/1f6a7.png) Remarks update:
[1] Many browsers report security issues, that the front-end-Application is not from a real http-server. 

In this case, the frontend might not load properly. With some browsers can user ignore this security issue, some not.

Therefore I decided that the car controller should take an alternative http-server port 80 role.

Simply edit the `host.js` file in `car_controller` with the path of the front-end-Application as example as follows:
```
const frontEndDirectory = ("/home/pi/Desktop/Frontend");  //At Line Number 11 with the path of frontend
```
The front-end-Application can now be accessed directly via the system's browser or via the IP address in the LAN, e.g. http://192.168.5.5

[2] If this problem exit.
````
Error: The module '/home/pi/Desktop/nodejsankisdk/node_modules/@abandonware/bluetooth-hci-socket/lib/binding/bluetooth_hci_socket.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 83. This version of Node.js requires
NODE_MODULE_VERSION 64. Please try re-compiling or re-installing

````
Please reinstall the module @abandonware/noble in car controller directory with:
`sudo npm uninstall @abandonware/noble` and `sudo npm install @abandonware/noble`



#### ![](http://twemoji.maxcdn.com/36x36/1f4e3.png) MQTT Topic from mqtt.js

| Topic | Description|
|---|---|
| Anki/WebClient/S/Status | Status of this application |
| Anki/WebClient/E/Share | Share track via MQTT-message |
| Anki/Host/`name of host`/S/HostStatus | Status of AnkiOverdrive Host |
| Anki/Host/`name of host`/S/Cars | List of found cars |
| Anki/Host/`name of host`/I | Request car controller to discover the cars or update MQTT-Bridge)|
| Anki/Car/`name of car`/E/track_piece_id| to subscribe Track piece ID|
| Anki/Car/`name of car`/E/track_location_id| to subscribe Track location ID|
| Anki/Car/`name of car`/E/Messages/ANKI_VEHICLE_MSG_V2C_LOCALIZATION_TRANSITION_UPDATE| to subscribe track piece changed|
| Anki/Car/`name of car`/E/speed| to subscribe cars speed.|
| Anki/Car/`name of car`/I| Request car to changed lane or speed.|

*** car controller was developed by Dominique Hofmann https://github.com/hofdo/nodejsankisdk. I did some edit for MQTT-Bridge-Function and static http-Server.
