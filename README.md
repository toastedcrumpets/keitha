# Keitha - The Raspberry pi touchscreen interface (python/React stack powered by sockets.io) for electronics projects

This project was inspired by the wonderful interface on Keithley's
modern DMMs and sourcemeters.

It uses a raspberry pi 4 (~£30) and [a cheap 7-inch 1024x600
touchscreen](https://amzn.to/2I995Gk). I've also used a generic clone
of [Adafruit's ADS1115 16bit ADC](https://amzn.to/34WOzBM) as my
demonstration sensor.

## Getting boot set up

First, install raspbian on your pi, get one of the versions with a
desktop. Follow the normal install instructions and update the system.

Use the raspi-config tool to enable I2C (for the ADC), and I also
enable ssh/VNC to remote work on the pi from my main PC. You should
also enable the splash screen.

Open a terminal, and clone this repository, then go into it.

```sh
git clone :keitha
cd keitha
```

Copy everything to the /boot folder. This will set up the display
to its native resolution, enable a splash screen at startup.

```sh
sudo cp pi_system_files/boot/* /boot/*
```

## Clearing up the desktop

Here we customise the desktop so that its still available (for
development) but its less intrusive.  Set your desktop background
image to `/boot/splash.png` by right-clicking the desktop and clicking
`desktop preferences`. Also right-click the panel, click `panel
settings`, then `Appearance`, change the color to `Solid Color` and
change the color so its opacity is zero. Then under the `Advanced` tab
select `Minimise panel when not in use`. Then right click the waste
basket on the desktop and select remove.

## Setting up the splash

Now copy the splash screen over the current Plymouth default.

```sh
sudo cp /boot/splash.png /usr/share/plymouth/themes/pix/splash.png
```

This will get overwritten on updates, but this is easily fixed by
rerunning the above command. This splash only appears for an instant,
as the GPU driver blanks the screen on X startup. You can disable the
GPU driver by commenting out `dtoverlay=vc4-fkms-v3d` in
`/boot/config.txt`, but your interface performance will suffer! I'll
revise this if I ever find a way around it.

## Setting up the frontend

You will need to install a lot of prerequisites. First, install `npm`
along with the python dependencies.

```sh
sudo apt install python3-scipy python3-pip npm python3-aiohttp
pip3 install python-socketio
```

Then we use node to get all of the required packages to build the
keitha frontend:

```sh
npm install
```

Finally, we build the frontend from the code and installed packages.

```sh
npm runs-script build
```

## Wiring up the ADC

Follow this [excellent
guide](https://learn.adafruit.com/raspberry-pi-analog-to-digital-converters/ads1015-slash-ads1115)
to check that your ADS1115 is wired up properly and install the python
library.  Once this works, you can start the
server.


## Running the backend on startup

The production web/inteface server is the `server.py` script. This
hosts the interface at http://localhost:8080/index.html.

To make this start at boot, start by copying the systemd startup
files, then enable the services and start them.

```sh
sudo cp pi_system_files/lib/systemd/system/keitha-* /lib/systemd/system/
sudo systemctl enable keitha-server.service
r9r97214
sudo systemctl enable keitha-worker.service
sudo systemctl start keitha-server.service
sudo systemctl start keitha-worker.service
```

You should now be able to open the frontend in the pi's browser using
the link above! Note: you can also connect to the frontend from
another PC/phone/whatever and control the system as the server is open
to the network.

## Starting the web application on boot (Kiosk mode)

First, we need to install unclutter (to hide our mouse when not used)

```sh 
sudo apt install unclutter
```

Then we change the startup of the desktop to run our `kiosk.sh` script
that opens chromium

```sh
sudo cp etc/xdg/lxsession/LXDE-pi/autostart /etc/xdg/lxsession/LXDE-pi/autostart
```

That's it! The raspberry pi should boot straight into our interface.

## (optional) Running the development server

Start up the NPM development server in the keitha directory:

```sh
npm start
```

This will let you connect to the frontend on port 3000
(i.e. http://localhost:3000 if you're on the raspberry pi). The
frontend will not work until the backend `server.py` and `worker.py`
are started. If you close this at any point then the development 
