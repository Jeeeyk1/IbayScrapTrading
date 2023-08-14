import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Row, Col, ListGroup, Image, Card, Button } from 'react-bootstrap';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Message from '../components/Message';
import Loader from '../components/Loader';
import { useNavigate } from 'react-router-dom';
import {
  useDeliverOrderMutation,
  useGetOrderDetailsQuery,
  useGetPaypalClientIdQuery,
  useMarkAsPaidMutation,
  usePayOrderMutation,
  useShipOutMutation,
} from '../slices/ordersApiSlice';

const OrderScreen = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();

  function payGcash() {
    navigate(`/order/gcash/${orderId}`);
  }
  const {
    data: order,
    refetch,
    isLoading,
    error,
  } = useGetOrderDetailsQuery(orderId);

  const [payOrder, { isLoading: loadingPay }] = usePayOrderMutation();

  const [deliverOrder, { isLoading: loadingDeliver }] =
    useDeliverOrderMutation();
  const [shipOutOrder, { isLoading: loadShip }] = useShipOutMutation();

  const { userInfo } = useSelector((state) => state.auth);

  const [{ isPending }, paypalDispatch] = usePayPalScriptReducer();
  const [paidOrder, { isLoading: loadPay }] = useMarkAsPaidMutation();

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

  function onApprove(data, actions) {
    return actions.order.capture().then(async function (details) {
      try {
        await payOrder({ orderId, details });
        refetch();
        toast.success('Order is paid');
      } catch (err) {
        toast.error(err?.data?.message || err.error);
      }
    });
  }

  // TESTING ONLY! REMOVE BEFORE PRODUCTION
  // async function onApproveTest() {
  //   await payOrder({ orderId, details: { payer: {} } });
  //   refetch();

  //   toast.success('Order is paid');
  // }

  function onError(err) {
    toast.error(err.message);
  }

  function createOrder(data, actions) {
    return actions.order
      .create({
        purchase_units: [
          {
            amount: { value: order.totalPrice },
          },
        ],
      })
      .then((orderID) => {
        return orderID;
      });
  }

  const deliverHandler = async () => {
    await deliverOrder(orderId);
    toast.success('Order received!');
    refetch();
  };
  const shipOutHandler = async () => {
    await shipOutOrder(orderId);
    refetch();
    toast.success('Order Shipped Out!');
  };
  const markAsPaidHandler = async () => {
    try {
      await paidOrder(orderId);
      refetch();
      toast.success('Order paid');
    } catch (err) {
      toast.error('Error' + err);
    }
  };

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
              <h2>Shipping</h2>
              <p>
                <strong>Name: </strong> {order.shippingAddress.fullName}
              </p>
              <p>
                <strong>Email: </strong>{' '}
                <a href={`mailto:${order.user.email}`}>{order.user.email}</a>
              </p>
              <p>
                <strong>Address: </strong>
                {order.shippingAddress.address}, {order.shippingAddress.city}{' '}
                {order.shippingAddress.postalCode},{' '}
                {order.shippingAddress.country}
              </p>
              <p>
              <strong>Contact Number: </strong> {order.shippingAddress.contactNumber}
            </p>
              {order.isShippedOut ? (
                <Message variant='success'>
                  Shipped out on {order.shippedOutAt}
                </Message>
              ) : (
                <Message variant='danger'>Not Shipped out</Message>
              )}
              {order.isDelivered ? (
                <Message variant='success'>
                  Delivered on {order.deliveredAt}
                </Message>
              ) : (
                <Message variant='danger'>Not Delivered</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Payment Method</h2>
              <p>
                <strong>Method: </strong>
                {order.paymentMethod}
              </p>
              {order.paymentMethod === 'Gcash' ? (
                <p>
                  <strong>Reference Number: </strong>
                  {order.gcashReferenceNumber}
                </p>
              ) : (
                <p></p>
              )}
              {order.isPaid ? (
                <Message variant='success'>Paid on {order.paidAt}</Message>
              ) : (
                <Message variant='danger'>Not Paid</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Order Items</h2>
              {order.orderItems.length === 0 ? (
                <Message>Order is empty</Message>
              ) : (
                <ListGroup variant='flush'>
                  {order.orderItems.map((item, index) => (
                    <ListGroup.Item key={index}>
                      <Row>
                        <Col md={1}>
                          <Image
                            src={item.image}
                            alt={item.name}
                            fluid
                            rounded
                          />
                        </Col>
                        <Col>
                          <Link to={`/product/${item.product}`}>
                            {item.name}
                          </Link>
                        </Col>
                        <Col md={4}>
                          {item.qty} x ₱{item.price}.00 = ₱
                          {item.qty * item.price}
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </ListGroup.Item>
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
              {!order.isPaid &&
                !userInfo.isAdmin &&
                order.paymentMethod === 'PayPal' && (
                  <ListGroup.Item>
                    {loadingPay && <Loader />}

                    {isPending ? (
                      <Loader />
                    ) : (
                      <div>
                        {/* THIS BUTTON IS FOR TESTING! REMOVE BEFORE PRODUCTION! */}
                        {/* <Button
                        style={{ marginBottom: '10px' }}
                        onClick={onApproveTest}
                      >
                        Test Pay Order
                      </Button> */}

                        <div>
                          <PayPalButtons
                            createOrder={createOrder}
                            onApprove={onApprove}
                            onError={onError}
                          ></PayPalButtons>
                        </div>
                      </div>
                    )}
                  </ListGroup.Item>
                )}
              {!order.isPaid &&
                !userInfo.isAdmin &&
                order.paymentMethod === 'Gcash' && (
                  <ListGroup.Item>
                    <Button
                      style={{
                        marginBottom: '10px',
                        margin: 'auto',
                        display: 'block',
                        backgroundColor: 'blue',
                      }}
                      onClick={payGcash}
                    >
                      Pay with Gcash
                    </Button>
                  </ListGroup.Item>
                )}

              {loadingDeliver && <Loader />}

              {userInfo &&
                userInfo.isAdmin &&
                !order.isDelivered &&
                !order.isShippedOut && (
                  <ListGroup.Item>
                    {!order.isPaid ? (
                      <Button
                        type='button'
                        className='btn btn-block'
                        onClick={markAsPaidHandler}
                      >
                        Mark As Paid
                      </Button>
                    ) : (
                      <Button
                        type='button'
                        className='btn btn-block'
                        onClick={shipOutHandler}
                      >
                        Ship Out
                      </Button>
                    )}
                  </ListGroup.Item>
                )}

              {userInfo &&
                !userInfo.isAdmin &&
                order.isShippedOut &&
                !order.isDelivered && (
                  <ListGroup.Item>
                    <Button
                      type='button'
                      className='btn btn-block'
                      onClick={deliverHandler}
                    >
                      Order received
                    </Button>
                  </ListGroup.Item>
                )}
              {userInfo && !userInfo.isAdmin && order.isDelivered && (
                <Message>
                  Click <Link to={`/product/review/${orderId}`}>Here</Link> to
                  write a review
                </Message>
              )}
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default OrderScreen;
