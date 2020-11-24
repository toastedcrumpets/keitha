# Keitha - The Raspberry pi touchscreen interface (python/React stack powered by sockets.io) for electronics projects

This project was inspired by the wonderful interface on Keithley's
modern DMMs and sourcemeters.

It uses a raspberry pi 4 (~£30) and [a cheap 7-inch 1024x600
touchscreen](https://amzn.to/2I995Gk). I've also used a generic
chinese clone of [Adafruit's ADS1115 16bit
ADC](https://amzn.to/34WOzBM) as my demonstration sensor.

## Setting up the screen's native resolution

First, install raspbian on your pi, get one of the versions with a
desktop. Follow the normal install instructions and update the system.

Use the raspi-config tool to enable I2C (for the ADC), and I also
enable ssh/VNC to remote work on the pi from my main PC. You should
also enable the splash screen.

Open a terminal, and clone this repository, then go into it.

```sh
git clone https://github.com/toastedcrumpets/keitha.git
cd keitha
```

Copy everything to the /boot folder. This will set up the display
to its native resolution and enable a splash screen at startup.

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
`/boot/config.txt` to keep the splash for longer, but your interface
performance will suffer! I'll revise this if I ever find a way around
it, instead I focussed on reducing boot time (see below).

## Setting up the web-page frontend

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

## (optional) Speeding up boot

If we run `systemd-analyze`, we can see that boot takes 27s (1)

```
Startup finished in 1.729s (kernel) + 13.602s (userspace) = 15.331s 
graphical.target reached after 13.552s in userspace
```

Running `systemd-analyze blame`, we see some candidates for disabling:

```
8.498s hciuart.service
8.248s exim4.service
1.901s raspi-config.service
1.861s udisks2.service
1.716s dev-mmcblk0p2.device
1.535s rpi-eeprom-update.service
1.124s networking.service
1.110s lightdm.service
```
We can also see what is critical to starting the graphical desktop using this `systemd-analyze critical-chain`

```
graphical.target @13.552s
└─multi-user.target @13.551s
  └─exim4.service @5.298s +8.248s
    └─network-online.target @5.281s
      └─network.target @5.259s
        └─wpa_supplicant.service @4.607s +643ms
          └─dbus.service @4.571s
            └─basic.target @4.519s
              └─sockets.target @4.519s
                └─avahi-daemon.socket @4.519s
                  └─sysinit.target @4.514s
                    └─systemd-timesyncd.service @4.134s +379ms
                      └─systemd-tmpfiles-setup.service @3.948s +162ms
                        └─local-fs.target @3.941s
                          └─boot.mount @3.890s +48ms
                            └─systemd-fsck@dev-disk-by\x2dpartuuid-cf17e282\x2d01.service @2.839s +528ms
                              └─dev-disk-by\x2dpartuuid-cf17e282\x2d01.device @2.828s
```

So lets start pruning. `exim4` is a mail server, that can
go. `avahi-daemon` gives some nice DNS features but not really
needed. 

```ssh
sudo systemctl disable exim4.service
sudo systemctl disable avahi-daemon.service
```

This gets us down to 14s boot. If we kill bluetooth support 

```ssh
sudo systemctl disable hciuart.service
sudo systemctl disable bluetooth.service
```

We can try and be sneaky and start these services later in `kiosk.sh`
if you have a bluetooth device (e.g. a mouse). Its really worthwhile
disabling it though, as now startup is 8.5s.

Now we remove synchronising the clock (if the right time is essential
to you, then you need to invest in a hardware clock for the RPi
anyhow). This gets us to 8s. Then we disable `raspi-config.service`
which seems to help with `raspi-config` functionality getting us to
6s.

```ssh
sudo systemctl  disable systemd-timesyncd.service
sudo systemctl  disable raspi-config.service
```

By now we've gotten a pretty quick start to the graphical.target, but
this still takes a while to boot

## (optional) Running the development server

Start up the NPM development server in the keitha directory:

```sh
npm start
```

This will let you connect to the frontend on port 3000
(i.e. http://localhost:3000 if you're on the raspberry pi). The
frontend will not work until the backend `server.py` and `worker.py`
are started. If you close this at any point then the development 


## TODO/Future ideas

These are some general ideas for improving the framework:

* [ ] Explore faster communications. 
 - [ ] Maybe move to native websockets instead of socket.io, and try binary data for readings to lower frontend overhead.
 - [ ] Maybe try polling instead of pushing readings updates. When the frontend falls behind it can't ever catch up.
* [ ] Improve the graph interface
 - [ ] x-axis origin entirely depends on the origin of python's time.perf_counter. Maybe translate this to actual time? 
 - [ ] Add a grid
 - [ ] Improve rendering of the axis. At the moment it is hard to read the values.
* [ ] Make the Pi LXI "compatible". We have remote frontpanel access
      already, we just need to add remote SCPI commands.
* [ ] Give examples of C++ worker and servers. This will massively improve CPU utilisation.

These are some ideas for projects with the screen:

* [ ] Design a 3D printable case for the screen and pi, including some
      front banana jacks. Make the pi expose its USB and network ports
      out the back. This case can then be adapted for the projects below:
* [ ] Make a full DMM using a ADS1256 module to learn about analogue front-end/protection.
* [ ] A [poor-man's Source Measure Unit (SMU)](https://poormanssmu.wordpress.com/)
* [ ] A control interface for old Mass Flow Controllers.
