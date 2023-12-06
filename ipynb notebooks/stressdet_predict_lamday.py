import boto3
import pickle
from decimal import Decimal
import json 
import numpy as np  # Import NumPy

# Load your scikit-learn model from S3 using pickle
s3_model_uri = 's3://scikit-bucket/rf_model.pkl'
s3_client = boto3.client('s3')
s3_client.download_file('scikit-bucket', 'rf_model.pkl', '/tmp/rf_model.pkl')
with open('/tmp/rf_model.pkl', 'rb') as model_file:
    rf_model = pickle.load(model_file)

# Define mean and std values for normalization
mean_values = [14.56083812, -5.95356046, 12.2858629 ,  1.31206636 , 32.64464937]
std_values = [46.92880856, 23.21466491, 30.16802293,  1.45192477, 1.59591028]

def normalize_data(data_point):
    # Normalize each feature using mean and std
    normalized_data_point = [(data_point[i] - Decimal(mean_values[i])) / Decimal(std_values[i]) for i in range(len(data_point))]
    return normalized_data_point


def lambda_handler(event, context):
    # TODO implement
    dynamodb = boto3.resource('dynamodb')
    stable = dynamodb.Table('stressdet')
    d_id = event["queryStringParameters"]["d_id"]
    # print(d_id)

    # Query DynamoDB to get the item with the latest s_id
    response = stable.query(
        KeyConditionExpression='d_id = :d_id',
        ExpressionAttributeValues={
            ':d_id': d_id  # Replace with your d_id value
        },
        ScanIndexForward=False,  # Sort in descending order to get the latest s_id
        Limit=2  # Get only one item with the latest s_id
    )
    
    # print("response ", response['Items'])
    
    if 'Items' in response and len(response['Items']) > 0:
        if len(response['Items'])>1:
            if len(response["Items"][0]["values"])>=len(response["Items"][1]["values"]):
                latest_item = response['Items'][0]
            else:
                latest_item = response['Items'][1]
        else:
            latest_item = response['Items'][0]
        s_id = latest_item['s_id']
        d_id = latest_item['d_id']
        values = latest_item['values']
        
        # Convert values to a list of dictionaries
        sensor_data = values
        
        # Prepare the data for prediction
        data_for_prediction = []
        for item in sensor_data:
            data_point = [
                Decimal(item['acc_x']),
                Decimal(item['acc_y']),
                Decimal(item['acc_z']),
                Decimal(item['eda']),
                Decimal(item['temp'])
            ]
            # Normalize the data point before adding it to the list
            normalized_data_point = normalize_data(data_point)
            data_for_prediction.append(normalized_data_point)
        
        # Make predictions using the RF model
        predictions = rf_model.predict(data_for_prediction)
        
        # Convert the NumPy array to a Python list
        predictions_list = predictions.tolist()
        
        # Prepare the response with all parameters
        response_body = {
            "Predictions": predictions_list,  # Use the Python list
            "acc_x": [float(item['acc_x']) for item in sensor_data],
            "acc_y": [float(item['acc_y']) for item in sensor_data],
            "acc_z": [float(item['acc_z']) for item in sensor_data],
            "eda": [float(item['eda']) for item in sensor_data],
            "temp": [float(item['temp']) for item in sensor_data],
            "timestamp": latest_item['timestamp'],
            "s_id": int(s_id),
            "d_id": d_id
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps(response_body)
        }
    else:
        return {
            'statusCode': 404,
            'body': "No data found with the specified d_id."
        }
