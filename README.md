# Keitha - The Raspberry pi touchscreen interface (python/React stack powered by sockets.io) for electronics projects

This project was lovingly inspired by the wonderful interface on
Keithley's modern DMMs and sourcemeters.

It uses a raspberry pi 4 (~£30) and [a cheap 7-inch 1024x600
touchscreen](https://amzn.to/2I995Gk). I've also used a generic clone
of [Adafruit's ADS1115 16bit ADC](https://amzn.to/34WOzBM) as my
demonstration sensor.

### `sudo apt install python-`

## Getting set up

First, install raspbian on your pi, get one of the versions with a
desktop. Follow the normal instructions and update the system.

Use the raspi-config tool to enable I2C (for the ADC), and I also
enable ssh/VNC to remote work on the pi from my main PC. Also enable
the splash for later.

Open a terminal, and clone this repository, then go into it.

```sh
git clone :keitha
cd keitha
```

Copy the config.txt to the /boot folder. This will set up the display
to its native resolution, then reboot.

```sh
sudo cp config.txt /boot/config.txt
sudo reboot
```

You will need to install a lot of prerequisites. First, install npm
along with the python dependencies.

```sh
sudo apt install python3-scipy python3-pip npm python3-aiohttp
pip3 install python-socketio
```

Then we get all the node packages installed to build the keitha frontend:

```sh
npm install
```

```sh
npm runs-script build
```

## Running the development server

Start up the NPM development server in the keitha directory:

```sh
npm start
```

This will let you connect to the frontend on port 3000
(i.e. http://localhost:3000 if you're on the raspberry pi).



## Wiring up the ADC

Follow this [excellent
guide](https://learn.adafruit.com/raspberry-pi-analog-to-digital-converters/ads1015-slash-ads1115)
to check that your ADS1115 is wired up properly and install the python
library.  Once this works, you can start the
server.


## Running the backend

