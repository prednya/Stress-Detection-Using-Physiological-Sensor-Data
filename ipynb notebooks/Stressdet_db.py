import json
import boto3
from decimal import Decimal
import datetime

def lambda_handler(event, context):
    # TODO implement
    dynamodb = boto3.resource('dynamodb')
    stable = dynamodb.Table('stressdet')
    print(event)
    event["d_id"]=str(event["d_id"])
    response = stable.scan()
    items = response['Items']
    pid = event["p_id"]
   
    if not items:
        sid = 0
    else:
        sid = max(int(item['s_id']) for item in items)
    event['values']=[event['values']]
    
    for item in event['values']:
        for key in ('acc_x', 'acc_y', 'acc_z', 'eda', 'temp'):
            item[key] = Decimal(str(item[key]))
            
    if pid==1:
        # Find the latest s_id and increment it
        sid = sid + 1
        # Format the date and time as strings
        current_datetime = datetime.datetime.now()
        # Add 6 hours and 30 minutes to the current time
        new_datetime = current_datetime + datetime.timedelta(hours=5, minutes=30)
        # Format the new time as a string
        date = new_datetime.strftime("%Y:%m:%d")
        time = new_datetime.strftime("%H:%M:%S")
        
        # Create the timestamp
        timestamp = f"{date}T{time}"
    
        # Add 'sid' to the event
        event["s_id"] = sid
        event["timestamp"] = timestamp
        # Insert the modified event into the DynamoDB table
        stable.put_item(Item=event)
    
    else:
        for item in items:
            if item["s_id"] == sid:
                prev=item

        prev["values"].extend(event["values"])
        stable.put_item(Item=prev)
        
    print("done adding")
    return {
        'statusCode': 200,
        'body': json.dumps({'s_id': sid})
    }