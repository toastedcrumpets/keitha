#!/bin/bash

#xset s noblank
#xset s off
#xset s -dpms

#unclutter -idle 0 &

sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' /home/pi/.config/chromium/Default/Preferences
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' /home/pi/.config/chromium/Default/Preferences

~/keitha/server.py &
~/keitha/worker.py &

/usr/bin/chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:8080 &

