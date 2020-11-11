#!/usr/bin/python3
import asyncio
import socketio
import time
import random

############# Global variables/state

# This is used to output status/payloads to the console
debug=False

# This is the worker's copy of the conf_state from the server.
conf_state = {
    'triggerMode':0,
}

# How often to upload readings to the server (tick). We rate limit
# this as the overhead of uploading 1000's of readings per second
# individually is pointless for rendering and also very slow.
FPS = 30

# The lists of readings to be uploaded in the next "tick"
unsent_readings = [
    [],
    []
]

# The variables used to measure the trigger/measuring rate
Hz_measure_last_reading_time = None  #When the last reading was taken
Hz_measure_interval_sum = 0  #The sum of all intervals measured since the last report
Hz_measure_samples = 0 #How many intervals have been sampled

############# Communication setup and maintainance

sio = socketio.AsyncClient(reconnection=True, reconnection_attempts=0)

# Handle connects 
@sio.event
async def connect():
    #Here we register with the server for configuration updates
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

# Handle conf_state updates coming in from the server
@sio.event
async def conf_state_update(payload):
    global Hz_measure_last_reading_time
    if debug:
        print("Conf update ", payload)
    conf_state.update(payload)

    #If we're not in continuous trigger mode, we can't really measure
    #the trigger rate. Reset the measurement.
    if (conf_state['triggerMode'] != 2):
        Hz_measure_last_reading_time = None

############# Periodic upload of readings
async def send_readings():
    global unsent_readings, Hz_measure_interval_sum, Hz_measure_samples
    to_send = len(unsent_readings[0])
    if to_send > 0:
        payload = unsent_readings
        unsent_readings = [[], []]
        await sio.emit('readings_state_add', payload)
        if debug:
            print("Uploading readings")

    if conf_state['triggerMode'] == 2:
        if Hz_measure_samples > 0:
            await sio.emit('conf_state_update', {'triggerRate':  Hz_measure_interval_sum / Hz_measure_samples})
            Hz_measure_interval_sum = 0
            Hz_measure_samples = 0
    else:
        await sio.emit('conf_state_update', {'triggerRate': -1})
            
############## The actual reading code
import Adafruit_ADS1x15
adc = Adafruit_ADS1x15.ADS1115()

async def make_reading():
    global unsent_readings, Hz_measure_last_reading_time, Hz_measure_interval_sum, Hz_measure_samples
    if conf_state['triggerMode'] > 0:
        adc_modes=[
            #gain, range (+-), LSB
            [2/3, 6.144, 187.5e-6],
            [1,   4.096, 125e-6],
            [2,   2.048, 62.5e-6],
            [4,   1.024, 31.25e-6],
            [8,   0.512, 15.625e-6],
            [16,  0.256, 7.8125e-6],
        ]
        mode=1
        channel=0
        reading = adc.read_adc(channel, gain=adc_modes[mode][0], data_rate=860) #860 is max speed
        reading_time = time.perf_counter()
        unsent_readings[0].append(reading_time)
        unsent_readings[1].append(reading * adc_modes[mode][2])

        #Update the measurements of the intervals for reading, but
        #only if in continuous sampling mode.
        if (conf_state['triggerMode'] == 2):
            if Hz_measure_last_reading_time != None:
                Hz_measure_interval_sum += reading_time - Hz_measure_last_reading_time
                Hz_measure_samples += 1
            Hz_measure_last_reading_time = reading_time
            
        if conf_state['triggerMode'] == 1:
            #We have to do this now to prevent extra readings while
            #waiting for the server to change the state
            conf_state['triggerMode'] = 0
            await sio.emit('conf_state_update', {'triggerMode':0})

            
############# The main loop entry point

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
        if (loop.time() - last) > 1.0 / FPS: #Limit data uploads to the FPS
            last = loop.time()
            await send_readings()
        await make_reading()
        #Here we sleep for 0.1 second if in hold mode (to lower CPU
        #usage during hold), or zero seconds to process background
        #tasks where needed.
        sleeptime = 0.1 * (conf_state['triggerMode'] == 0)
        await asyncio.sleep(sleeptime)
        
if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main_loop(loop))
