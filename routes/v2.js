const express=require('express')
const jwt=require('jsonwebtoken')
const cors=require('cors')

const {verifyToken, apiLimiter}=require('./middlewares')
const {Domain, User, Post, Hashtag}=require('../models')

const router=express.Router()

router.use(cors({
    credentials:true
}))

router.post('/token', async(req,res)=>{
    const {clientSecret}=req.body
    try {
        const domain=await Domain.findOne({
            where:{clientSecret},
            include:{
                model:User,
                attribute:['nick','id']
            }
        })
        if (!domain) {
            return res.status(401)
                      .json({
                        code:401,
                        message:'등록되지 않은 도메인입니다. 먼저 도메인을 등록하세요.'
                      })
        }
        //토큰은 API 사용을 허가하는 임의의 값. 이 안에 고유의 서버 토큰 비밀키 존재.
        //jwt.sign()메서드로 토큰을 발급받는다.
        const token=jwt.sign({
            id:domain.User.id,
            nick:domain.User.nick,
        },process.env.JWT_SECRET,{
            expiresIn:'30m', //30분
            issuer:'nodebird'
        })
        // 토큰 예시:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
        // 토큰은 임의의 제한 값. 토큰은 항상 유지되지 않고, API 사용시 발급된다.
        return res.json({
            code:200,
            message:'토큰이 발급되었습니다.',
            token
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            code:500,
            message:'서버에러'
        })
    }
})

// 발급된 토큰으로 API 사용하는 상황. apiLimiter는 API 사용하는 사용량 제한.
router.get('/test',verifyToken,apiLimiter,(req,res)=>{
    res.json(req.decoded)
})

router.get('/posts/my', verifyToken, apiLimiter,(req,res)=>{
    Post.findAll({where:{userId:req.decoded.id}})
        .then((posts)=>{
            console.log(posts)
            res.json({
                code:200,
                payload:posts
            })
        })
        .catch((error)=>{
            console.error(error)
            return res.status(500).json({
                code:500,
                message:'서버 에러'
            })
        })
})

router.post('/posts/hashtag/:title',verifyToken,apiLimiter, async(req,res)=>{
    try {
        const hashtag=await Hashtag.findOne({where:{title:req.params.title}})
        if (hashtag) {
            return res.status(404)
                      .json({
                        code:404,
                        message:'검색 결과가 없습니다. - /posts/hashtag/:title'
                      })
        }
        const posts=await hashtag.getPosts()
        return res.json({
            code:200,
            payload:posts
        })
    } catch (err) {
        console.error(err)
        return res.status(500)
                  .json({
                    code:500,
                    message:'서버 에러'
                  })
    }
})

module.exports=router