#!/usr/bin/python3
import asyncio
import socketio
import time
import random

debug=True

conf_state = {
    'triggerMode':0,
}

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

async def main():
    #The first connection is never retried if it fails (later
    #disconnects are though), so we have to handle initial reconnects
    #ourselves
    connected = False
    while not connected:
        try:
            await sio.connect('http://localhost:8080')
            connected = True
        except socketio.exceptions.ConnectionError as err:
            if debug:
                print("ConnectionError: %s" % err)
            #Sleep 5s before retrying
            await sio.sleep(5)
    
    while True:
        if conf_state['triggerMode'] > 0:
            await sio.emit('readings_state_add', [(time.perf_counter(), random.uniform(0, 1))])
            if conf_state['triggerMode'] == 1:
                await sio.emit('conf_state_update', {'triggerMode':0})
                #We have to do this to prevent extra readings while
                #waiting for the server to change the state
                conf_state['triggerMode'] = 0

        await sio.sleep(0.01)

asyncio.run(main())
    #This is the main event loop.
        
