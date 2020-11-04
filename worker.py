from aiohttp import web
import socketio
import time
import random

sio = socketio.Client(reconnection=True, reconnection_attempts=0)
@sio.event
def connect():
    print('Worker thread connected')

@sio.event
def disconnect():
    print('Worker thread disconnected')

status = {
    'triggerMode':0,
}

#We merge status changes when 
@sio.on('status_change')
def status_change(payload):
    print("Worker status_change", payload)
    status.update(payload)

time.sleep(2)
sio.connect('http://localhost:8080')

while True:
    if status['triggerMode'] > 0:
        value = random.uniform(0, 1)
        sio.emit('reading', value)
        if status['triggerMode'] == 1:
            sio.emit('status_change', {'triggerMode':0})
            status['triggerMode'] = 0

    sio.sleep(0.01)
    #This is the main event loop.
        
