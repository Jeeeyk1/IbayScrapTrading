import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Row,
  Col,
  ListGroup,
  Image,
  Card,
  Button,
  Form,
} from 'react-bootstrap';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Message from '../components/Message';
import Loader from '../components/Loader';
import Gcash from '../../src/assets/gcash.jpg';
import { useNavigate } from 'react-router-dom';
import {
  useDeliverOrderMutation,
  useGetOrderDetailsQuery,
  useGetPaypalClientIdQuery,
  usePayOrderMutation,
  useSubmitRefNoMutation,
} from '../slices/ordersApiSlice';
import FormContainer from '../components/FormContainer';

const GcashPaymentScreen = () => {
  const { id: orderId } = useParams();
  const [referenceNumber, setReferenceNumber] = useState('');

  const {
    data: order,
    refetch,
    isLoading,
    error,
  } = useGetOrderDetailsQuery(orderId);

  const [submitRefNo, { isLoading: loading, error: err1 }] =
    useSubmitRefNoMutation();
  const [payOrder, { isLoading: loadingPay }] = usePayOrderMutation();

  const [deliverOrder, { isLoading: loadingDeliver }] =
    useDeliverOrderMutation();

  const { userInfo } = useSelector((state) => state.auth);

  const [{ isPending }, paypalDispatch] = usePayPalScriptReducer();
  const navigate = useNavigate();
  const {
    data: paypal,
    isLoading: loadingPayPal,
    error: errorPayPal,
  } = useGetPaypalClientIdQuery();

  useEffect(() => {
    console.log(order);
    if (!errorPayPal && !loadingPayPal && paypal.clientId) {
      const loadPaypalScript = async () => {
        paypalDispatch({
          type: 'resetOptions',
          value: {
            'client-id': paypal.clientId,
            currency: 'PHP',
          },
        });
        paypalDispatch({ type: 'setLoadingStatus', value: 'pending' });
      };
      if (order && !order.isPaid) {
        if (!window.paypal) {
          loadPaypalScript();
        }
      }
    }
  }, [errorPayPal, loadingPayPal, order, paypal, paypalDispatch]);
  async function submitGcash(e) {
    e.preventDefault();
    if (window.confirm('Are you sure with your reference number?')) {
      console.log(referenceNumber);
      console.log(orderId);
      try {
        axios.put(`/api/orders/pay/${orderId}`, {
          referenceNumber,
        });
        console.log(err1);
        toast.success('Reference number submitted');
        navigate(`/order/${orderId}`);
      } catch (err) {
        toast.error(err?.data?.message || err.error);
      }
    } else {
      return;
    }
  }

  return isLoading ? (
    <Loader />
  ) : error ? (
    <Message variant='danger'>{error.data.message}</Message>
  ) : (
    <>
      <h1>Order {order._id}</h1>
      <Row>
        <Col md={8}>
          <ListGroup variant='flush'>
            <ListGroup.Item>
              <h2>Hi, {order.user.name}!</h2>
              <p>
                Please pay exact amount : <strong>{order.totalPrice} </strong>
              </p>
            </ListGroup.Item>

            <ListGroup.Item>
              <Image
                src={Gcash}
                fluid
                rounded
                style={{ height: '500px', margin: 'auto', display: 'block' }}
              />
            </ListGroup.Item>
            <ListGroup.Item>
              <FormContainer>
                <h1>Payment Details</h1>
                <Message variant='warning'>
                  Please do check your reference number before submitting it,
                  Thank you!
                </Message>
                <Form onSubmit={submitGcash}>
                  <Form.Group className='my-2' controlId='referenceNumber'>
                    <Form.Label>Reference Number</Form.Label>
                    <Form.Control
                      type='text'
                      placeholder='Enter Reference Number'
                      value={referenceNumber}
                      required
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    ></Form.Control>
                  </Form.Group>

                  <Button type='submit' variant='primary'>
                    Submit
                  </Button>
                </Form>
              </FormContainer>
            </ListGroup.Item>

            <ListGroup.Item></ListGroup.Item>
          </ListGroup>
        </Col>
        <Col md={4}>
          <Card>
            <ListGroup variant='flush'>
              <ListGroup.Item>
                <h2>Order Summary</h2>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Items</Col>
                  <Col>₱{order.itemsPrice}.00</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Shipping</Col>
                  <Col>₱{order.shippingPrice}.00</Col>
                </Row>
              </ListGroup.Item>

              <ListGroup.Item>
                <Row>
                  <Col>Total</Col>
                  <Col>₱{order.totalPrice}</Col>
                </Row>
              </ListGroup.Item>
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default GcashPaymentScreen;
