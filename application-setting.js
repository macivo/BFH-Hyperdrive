/***********************************************************************************************************************
*****  Default Setting for Anki-Overdrive ******
**********************************************************************************************************************/

const ApplicationSetting = {
    /* Editor */
    Column:5,
    Row:3,
    /* lane: Only odd number*/
    Lanes:8,

    /* MQTT Setting */
    MQTTHost:"192.168.5.5",
    MQTTPort:9001,
    MQTTBasePath:"ws",
    MQTTUsername:"",
    MQTTPassword:"",
    MQTTClientID:"AnkiOverdriveWebsocket",

    /* Paper settings A3 in cm*/
    PaperWidth:420,
    PaperHeight:297
};

/**
 *  Public interface
 **/
export default {
    get: function (){
        return ApplicationSetting;
    }
}