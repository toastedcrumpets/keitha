import socketio

from collections.abc import Mapping
def deep_update(d1, d2):
    #This function merges updates to dictionaries, overwrites everything else
    if all((isinstance(d, Mapping) for d in (d1, d2))):
        for k, v in d2.items():
            d1[k] = deep_update(d1.get(k), v)
        return d1
    return d2

# This is used to output status/payloads to the console
debug=False

#All state is maintained by the server. The webpage cache's its local
#copy but the authority is the server. State is broken up into control
#state, buffer state, and readings
conf_state = {
    'triggerMode':0,
    'triggerRate':-1,
    'major_mode':0, 
    'major_modes':['N/A'],
    'options':{},
}
