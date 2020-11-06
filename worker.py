#!/usr/bin/python3
import asyncio
import socketio
import time
import random

############# Global variables/state

debug=False

conf_state = {
    'triggerMode':0,
}

FPS = 30

unsent_readings = []

############# Communications 

sio = socketio.AsyncClient(reconnection=True, reconnection_attempts=0)

@sio.event
async def connect():
    #Register for configuration updates
    await sio.emit('conf_state_sub')
    if debug:
        print('Worker thread connected')

@sio.event
async def connect_error(message):
    if debug:
        print('Connection error:', message)
        
@sio.event
def disconnect():
    if debug:
        print('Worker thread disconnected')

@sio.event    
async def conf_state_update(payload):
    if debug:
        print("Conf update ", payload)
    conf_state.update(payload)

############# Periodic upload of readings
async def send_readings():
    global unsent_readings
    if len(unsent_readings):
        payload = unsent_readings
        unsent_readings = []
        await sio.emit('readings_state_add', payload)
        if debug:
            print("Uploading readings")
    
############# The main entry point 

async def make_reading():
    global unsent_readings
    if conf_state['triggerMode'] > 0:
        unsent_readings.append((time.perf_counter(), random.uniform(0, 1)))
        if conf_state['triggerMode'] == 1:
            #We have to do this now to prevent extra readings while
            #waiting for the server to change the state
            conf_state['triggerMode'] = 0
            await sio.emit('conf_state_update', {'triggerMode':0})

async def main_loop(loop):
    ### Connect to the server
    #The first connection is never retried if it fails (later
    #disconnects are retried automatically), so we have to handle
    #initial reconnects ourselves.
    connected = False
    while not connected:
        try:
            await sio.connect('http://localhost:8080')
            connected = True
        except socketio.exceptions.ConnectionError as err:
            if debug:
                print("ConnectionError: %s" % err)
                #Sleep 5s before retrying
            await asyncio.sleep(5)
                
    last = loop.time()
    while True:
        await asyncio.sleep(0)
        if (loop.time() - last) > 1.0 / FPS: #Limit data uploads to the FPS
            last = loop.time()
            await send_readings()
        await make_reading()
        
            
if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main_loop(loop))
